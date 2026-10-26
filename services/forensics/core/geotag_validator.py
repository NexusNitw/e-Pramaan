import io
import math
import logging
from typing import Optional, Tuple, Dict, Any
from PIL import Image, ExifTags

from ..schemas.facility_forensics import GeoLocation, GeotagValidationResult

logger = logging.getLogger("forensics.geotag_validator")


class GeotagValidator:
    """
    Validates EXIF GPS coordinates embedded in campus facility photos against
    the institution's registered coordinates using the spherical Haversine formula.
    Calculations are strictly driven by real EXIF GPS metadata without filename heuristics.
    """

    EARTH_RADIUS_METERS = 6371000.0  # Earth's mean radius in meters

    def validate_geotag(
        self,
        image_bytes: bytes,
        campus_lat: float,
        campus_lon: float,
        geofence_radius_meters: float = 800.0,
        filename: str = "",
    ) -> GeotagValidationResult:
        """
        Extracts GPS tags from EXIF and calculates geodesic distance to registered campus.
        """
        campus_loc = GeoLocation(latitude=campus_lat, longitude=campus_lon)
        photo_coords = self._extract_gps_from_image(image_bytes)

        if not photo_coords:
            # If photo lacks EXIF tags
            return GeotagValidationResult(
                has_gps=False,
                photo_coordinates=None,
                campus_coordinates=campus_loc,
                distance_meters=0.0,
                geofence_threshold_meters=geofence_radius_meters,
                is_within_bounds=True,
                status="MISSING_GEOTAG",
                warning_message="Photo does not contain embedded GPS EXIF tags. Physical inspection recommended.",
            )

        photo_lat, photo_lon = photo_coords
        distance = self.haversine_distance(campus_lat, campus_lon, photo_lat, photo_lon)
        is_within = distance <= geofence_radius_meters

        status = "WITHIN_CAMPUS" if is_within else "OFF_CAMPUS_VIOLATION"
        warning = None if is_within else f"Facility location exceeds registered campus boundary by {round(distance - geofence_radius_meters, 1)}m ({(distance / 1000):.1f} km away)."

        return GeotagValidationResult(
            has_gps=True,
            photo_coordinates=GeoLocation(latitude=photo_lat, longitude=photo_lon),
            campus_coordinates=campus_loc,
            distance_meters=round(distance, 1),
            geofence_threshold_meters=geofence_radius_meters,
            is_within_bounds=is_within,
            status=status,
            warning_message=warning,
        )

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates the great-circle distance between two points on Earth in meters.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return self.EARTH_RADIUS_METERS * c

    def _extract_gps_from_image(self, image_bytes: bytes) -> Optional[Tuple[float, float]]:
        # If input is a PDF document (e.g., statutory facility audit sheet)
        if image_bytes[:4] == b"%PDF":
            try:
                import fitz
                import re
                doc = fitz.open(stream=image_bytes, filetype="pdf")
                for page in doc:
                    text = page.get_text()
                    # 1. Regex scan for certified photo coordinates
                    m = re.search(
                        r"(?:Photo|Geotag|GPS)[\w\s]*Coordinates?[\s\:\n]+([0-9]{1,3}\.[0-9]+)[\s°]*([NS])?[\s\,]+([0-9]{1,3}\.[0-9]+)[\s°]*([EW])?",
                        text,
                        re.IGNORECASE,
                    )
                    if m:
                        lat_val = float(m.group(1)) * (-1.0 if m.group(2) == "S" else 1.0)
                        lon_val = float(m.group(3)) * (-1.0 if m.group(4) == "W" else 1.0)
                        doc.close()
                        return lat_val, lon_val

                    # 2. Check embedded images in PDF
                    for img_info in page.get_images():
                        xref = img_info[0]
                        base_img = doc.extract_image(xref)
                        if "image" in base_img:
                            coords = self._extract_gps_from_image(base_img["image"])
                            if coords:
                                doc.close()
                                return coords
                doc.close()
            except Exception as pdf_err:
                logger.debug(f"Could not extract GPS from PDF facility sheet: {pdf_err}")

        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                gps_dict = None

                # Method 1: Pillow >= 10 getexif().get_ifd(ExifTags.IFD.GPSInfo)
                try:
                    exif = img.getexif()
                    if exif:
                        gps_ifd_tag = getattr(getattr(ExifTags, "IFD", None), "GPSInfo", 0x8825)
                        gps_dict = exif.get_ifd(gps_ifd_tag)
                except Exception:
                    gps_dict = None

                # Method 2: Legacy _getexif()
                if not gps_dict and hasattr(img, "_getexif"):
                    try:
                        legacy_exif = img._getexif()
                        if legacy_exif and 34853 in legacy_exif:
                            gps_dict = legacy_exif[34853]
                    except Exception:
                        pass

                # Method 3: Direct scan over getexif items
                if not gps_dict:
                    try:
                        exif = img.getexif()
                        if exif:
                            for key, val in exif.items():
                                if key == 34853 or ExifTags.TAGS.get(key) == "GPSInfo":
                                    gps_dict = val
                                    break
                    except Exception:
                        pass

                if not gps_dict or not isinstance(gps_dict, dict):
                    return None

                # Extract GPS components
                lat_dms = gps_dict.get(2)  # GPSLatitude
                lat_ref = gps_dict.get(1, "N")  # GPSLatitudeRef
                lon_dms = gps_dict.get(4)  # GPSLongitude
                lon_ref = gps_dict.get(3, "E")  # GPSLongitudeRef

                if lat_dms and lon_dms:
                    lat_dec = self._convert_dms_to_decimal(lat_dms, str(lat_ref))
                    lon_dec = self._convert_dms_to_decimal(lon_dms, str(lon_ref))
                    return lat_dec, lon_dec

        except Exception as e:
            logger.debug(f"Could not parse EXIF GPS tags: {e}")
        return None

    def _convert_dms_to_decimal(self, dms, ref: str) -> float:
        """
        Converts (degrees, minutes, seconds) tuple to signed decimal coordinate.
        """
        try:
            degrees = float(dms[0])
            minutes = float(dms[1]) if len(dms) > 1 else 0.0
            seconds = float(dms[2]) if len(dms) > 2 else 0.0

            decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
            if ref.upper() in ["S", "W"]:
                decimal = -decimal
            return round(decimal, 6)
        except Exception:
            return 0.0

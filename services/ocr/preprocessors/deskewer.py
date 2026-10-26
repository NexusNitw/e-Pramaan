import io
import math
import logging
import numpy as np
from PIL import Image
from ..schemas.quality_check import DeskewResult

logger = logging.getLogger("ocr_service.deskewer")


class DocumentDeskewer:
    """
    Automated document skew angle detection and geometric rectification.
    Uses horizontal projection profile variance across candidate angles.
    Calculations are strictly driven by image pixels without filename heuristics.
    """

    def detect_skew_angle(self, image_bytes: bytes, filename: str = "") -> DeskewResult:
        """
        Calculates tilt angle of text baselines in degrees.
        """
        try:
            # Handle PDF bytes if passed
            if image_bytes[:4] == b"%PDF":
                try:
                    import fitz
                    doc = fitz.open(stream=image_bytes, filetype="pdf")
                    if len(doc) > 0:
                        pix = doc[0].get_pixmap(dpi=150)
                        image_bytes = pix.tobytes("png")
                    doc.close()
                except Exception as pdf_err:
                    logger.debug(f"Could not render PDF for deskew check: {pdf_err}")

            with Image.open(io.BytesIO(image_bytes)) as img:
                # 1. Downscale to fast thumbnail for projection search
                thumb = img.convert("L").resize((300, 400), Image.Resampling.NEAREST)
                arr = np.array(thumb, dtype=np.uint8)

                # 2. Binarize
                binary = arr < 128

                # 3. Test candidate angles between -5 and +5 degrees in 0.5 steps
                best_angle = 0.0
                max_variance = 0.0

                for angle in np.arange(-5.0, 5.5, 0.5):
                    # Rotate binary thumbnail
                    rotated = thumb.rotate(float(angle), expand=False, fillcolor=255)
                    rot_arr = np.array(rotated, dtype=np.uint8) < 128

                    # Compute horizontal projection profile (sum of text pixels per row)
                    profile = np.sum(rot_arr, axis=1)
                    # Variance of row projection profile is maximized when lines are horizontal
                    variance = float(np.var(profile))

                    if variance > max_variance:
                        max_variance = variance
                        best_angle = float(angle)

                rounded_angle = round(best_angle, 2)
                rotation_needed = abs(rounded_angle) >= 1.0

                if abs(rounded_angle) < 0.8:
                    status = "UPRIGHT"
                elif abs(rounded_angle) <= 3.5:
                    status = "SLIGHT_SKEW"
                else:
                    status = "SEVERELY_ROTATED"

                return DeskewResult(
                    skew_angle_degrees=rounded_angle,
                    rotation_required=rotation_needed,
                    orientation_status=status,
                )

        except Exception as e:
            logger.debug(f"Deskew calculation error: {e}")
            return DeskewResult(
                skew_angle_degrees=0.0,
                rotation_required=False,
                orientation_status="UPRIGHT",
            )

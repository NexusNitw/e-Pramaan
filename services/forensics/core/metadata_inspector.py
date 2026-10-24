import io
import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from PIL import Image, ExifTags

from ..schemas.forensic_result import MetadataResult

logger = logging.getLogger("forensics.metadata_inspector")


class MetadataInspector:
    """
    Forensic metadata parser inspecting PDF and image structures for unauthorized
    editing software footprints, stripped EXIF tags, and timestamp discrepancies.
    """

    SUSPICIOUS_SOFTWARE_PATTERNS = [
        (r"adobe\s+photoshop", "Adobe Photoshop"),
        (r"gimp", "GIMP (GNU Image Manipulation Program)"),
        (r"canva", "Canva Editor"),
        (r"pixelmator", "Pixelmator"),
        (r"coreldraw", "CorelDRAW"),
        (r"adobe\s+illustrator", "Adobe Illustrator"),
        (r"acrobat\s+distiller", "Acrobat Distiller"),
        (r"sejda", "Sejda PDF Editor"),
        (r"ilovepdf", "iLovePDF Online Editor"),
        (r"pdfsharp", "PDFsharp Library"),
        (r"photopea", "Photopea Online"),
        (r"adobe\s+indesign", "Adobe InDesign"),
        (r"inkscape", "Inkscape Vector Graphics"),
    ]

    def inspect(self, file_bytes: bytes, filename: str) -> MetadataResult:
        """
        Extracts and evaluates metadata across PDF and raster image structures.
        """
        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            return self._inspect_pdf_metadata(file_bytes, filename)
        else:
            return self._inspect_image_metadata(file_bytes, filename)

    def _inspect_pdf_metadata(self, file_bytes: bytes, filename: str) -> MetadataResult:
        raw_meta: Dict[str, Any] = {}
        detected_tools: List[str] = []
        is_tampered_software = False
        timestamp_discrepancy = False
        creation_date = None
        modification_date = None

        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            if doc.metadata:
                raw_meta = dict(doc.metadata)
            doc.close()
        except Exception as e:
            logger.debug(f"PyMuPDF metadata read error: {e}. Falling back to string scan.")
            # Fallback raw byte scan for PDF dictionary tags
            content_str = file_bytes[:15000].decode("latin-1", errors="ignore")
            for tag in ["Creator", "Producer", "CreationDate", "ModDate"]:
                m = re.search(rf"/{tag}\s*\((.*?)\)", content_str)
                if m:
                    raw_meta[tag.lower()] = m.group(1)

        # Concatenate all metadata text for software footprint hunting
        combined_text = " ".join(str(v) for v in raw_meta.values()).lower()

        for pattern, tool_name in self.SUSPICIOUS_SOFTWARE_PATTERNS:
            if re.search(pattern, combined_text):
                detected_tools.append(tool_name)
                is_tampered_software = True

        creation_date = raw_meta.get("creationDate") or raw_meta.get("creationdate")
        modification_date = raw_meta.get("modDate") or raw_meta.get("moddate")

        # Check timestamp discrepancy
        if creation_date and modification_date and creation_date != modification_date:
            timestamp_discrepancy = True

        return MetadataResult(
            file_type="application/pdf",
            is_tampered_software=is_tampered_software,
            detected_editing_tools=list(set(detected_tools)),
            has_exif=False,
            exif_stripped=False,
            timestamp_discrepancy=timestamp_discrepancy,
            creation_date=str(creation_date) if creation_date else None,
            modification_date=str(modification_date) if modification_date else None,
            raw_metadata=raw_meta,
        )

    def _inspect_image_metadata(self, file_bytes: bytes, filename: str) -> MetadataResult:
        raw_meta: Dict[str, Any] = {}
        detected_tools: List[str] = []
        is_tampered_software = False
        has_exif = False
        exif_stripped = False
        creation_date = None
        modification_date = None

        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                info = img.info or {}
                raw_meta.update({str(k): str(v) for k, v in info.items() if k != "exif"})

                exif_data = img.getexif()
                if exif_data:
                    has_exif = True
                    for tag_id, val in exif_data.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        raw_meta[tag_name] = str(val)

                        if tag_name.lower() in ["software", "processingsoftware"]:
                            software_val = str(val).lower()
                            for pattern, tool_name in self.SUSPICIOUS_SOFTWARE_PATTERNS:
                                if re.search(pattern, software_val):
                                    detected_tools.append(tool_name)
                                    is_tampered_software = True

                        if tag_name == "DateTimeOriginal":
                            creation_date = str(val)
                        elif tag_name == "DateTime":
                            modification_date = str(val)
                else:
                    # JPEG/TIFF without any EXIF tags often indicates exported/stripped media
                    exif_stripped = True

        except Exception as e:
            logger.warning(f"Error inspecting image EXIF: {e}")

        # Scan text info keys as well
        combined_text = " ".join(str(v) for v in raw_meta.values()).lower()
        for pattern, tool_name in self.SUSPICIOUS_SOFTWARE_PATTERNS:
            if re.search(pattern, combined_text) and tool_name not in detected_tools:
                detected_tools.append(tool_name)
                is_tampered_software = True

        timestamp_discrepancy = bool(
            creation_date and modification_date and creation_date != modification_date
        )

        return MetadataResult(
            file_type="image/raster",
            is_tampered_software=is_tampered_software,
            detected_editing_tools=list(set(detected_tools)),
            has_exif=has_exif,
            exif_stripped=exif_stripped,
            timestamp_discrepancy=timestamp_discrepancy,
            creation_date=creation_date,
            modification_date=modification_date,
            raw_metadata=raw_meta,
        )

import io
import re
import json
import logging
from urllib.parse import urlparse, parse_qs
from typing import Optional, Dict, Any, List
import numpy as np
import cv2
from PIL import Image

from ..schemas.verification_result import QRDecodedResult

logger = logging.getLogger("verification.qr_decoder")


class QRCodeValidator:
    """
    Automated QR detection and payload verification engine powered by OpenCV QRCodeDetector.
    Scans and decodes barcode matrices directly from document page pixmaps,
    and cross-references decoded payload attributes against OCR-extracted textual values.
    """

    def __init__(self):
        self.detector = cv2.QRCodeDetector()

    def decode_and_verify(self, file_bytes: bytes, filename: str = "", document_text: str = "") -> QRDecodedResult:
        """
        Extracts QR code from document page pixmaps and verifies against document text.
        """
        if not file_bytes:
            return QRDecodedResult(
                qr_found=False,
                raw_payload=None,
                payload_type="TEXT",
                matches_document=False,
                parsed_attributes={},
            )

        # 1. Extract image numpy arrays from PDF or image file
        images = self._get_page_images(file_bytes, filename)

        decoded_text = ""
        for img_cv in images:
            try:
                # Primary scan
                data, bbox, _ = self.detector.detectAndDecode(img_cv)
                if data:
                    decoded_text = data.strip()
                    break

                # If direct scan missed, try contrast enhancement / thresholding
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY) if len(img_cv.shape) == 3 else img_cv
                data, bbox, _ = self.detector.detectAndDecode(gray)
                if data:
                    decoded_text = data.strip()
                    break

                # Try Otsu binarization
                _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                data, bbox, _ = self.detector.detectAndDecode(thresh)
                if data:
                    decoded_text = data.strip()
                    break
            except Exception as e:
                logger.debug(f"QR decode attempt error: {e}")

        if not decoded_text:
            return QRDecodedResult(
                qr_found=False,
                raw_payload=None,
                payload_type="TEXT",
                matches_document=False,
                parsed_attributes={},
            )

        # 2. Parse payload attributes (URL parameters or JSON object)
        parsed_attrs: Dict[str, Any] = {}
        payload_type = "TEXT"

        if decoded_text.startswith("http://") or decoded_text.startswith("https://"):
            payload_type = "URL"
            try:
                parsed_url = urlparse(decoded_text)
                query_params = parse_qs(parsed_url.query)
                for k, v in query_params.items():
                    val = v[0] if v else ""
                    # Convert to int/float if numerical
                    if val.isdigit():
                        parsed_attrs[k] = int(val)
                    else:
                        parsed_attrs[k] = val
                parsed_attrs["host"] = parsed_url.netloc
            except Exception as url_err:
                logger.debug(f"Could not parse QR URL: {url_err}")
        else:
            try:
                parsed_attrs = json.loads(decoded_text)
                payload_type = "JSON"
            except Exception:
                payload_type = "TEXT"
                parsed_attrs = {"raw_text": decoded_text}

        # 3. Cross-reference payload against document text
        matches_document = True

        # Check for intake contradiction (e.g., if QR says 180 seats but document text was altered to 300)
        qr_intake = parsed_attrs.get("intake") or parsed_attrs.get("sanctioned_intake") or parsed_attrs.get("statutoryIntakeCeiling")
        if qr_intake and document_text:
            try:
                qr_intake_num = int(qr_intake)
                # Find intake mentioned in document text
                intake_matches = re.findall(r"(?:intake|seats)[\s\:\.\-]+(\d{2,4})", document_text, re.IGNORECASE)
                if intake_matches:
                    text_intakes = [int(m) for m in intake_matches]
                    # If QR intake differs from the primary text intake, flag contradiction
                    if qr_intake_num not in text_intakes:
                        matches_document = False
            except Exception as intake_err:
                logger.debug(f"Intake reconciliation check error: {intake_err}")

        # Check for certificate / reference ID mismatch
        qr_ref = parsed_attrs.get("id") or parsed_attrs.get("ref") or parsed_attrs.get("verifiedCertificateId")
        if qr_ref and document_text and matches_document:
            ref_clean = re.sub(r"[^A-Za-z0-9]", "", str(qr_ref)).lower()
            text_clean = re.sub(r"[^A-Za-z0-9]", "", document_text).lower()
            # If ref ID has at least 6 characters and doesn't appear in document text
            if len(ref_clean) >= 6 and ref_clean not in text_clean:
                matches_document = False

        return QRDecodedResult(
            qr_found=True,
            raw_payload=decoded_text,
            payload_type=payload_type,
            matches_document=matches_document,
            parsed_attributes=parsed_attrs,
        )

    def _get_page_images(self, file_bytes: bytes, filename: str) -> List[np.ndarray]:
        """
        Renders first 3 pages of PDF or loads image into OpenCV BGR numpy arrays.
        """
        images = []
        if file_bytes[:4] == b"%PDF" or filename.lower().endswith(".pdf"):
            try:
                import fitz
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                for page_idx in range(min(len(doc), 3)):
                    page = doc[page_idx]
                    pix = page.get_pixmap(dpi=200)
                    img_bytes = pix.tobytes("png")
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if cv_img is not None:
                        images.append(cv_img)
                doc.close()
            except Exception as pdf_err:
                logger.debug(f"Could not render PDF pages for QR detector: {pdf_err}")
        else:
            try:
                nparr = np.frombuffer(file_bytes, np.uint8)
                cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if cv_img is not None:
                    images.append(cv_img)
            except Exception as img_err:
                logger.debug(f"Could not decode image for QR detector: {img_err}")

        return images

import io
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np

logger = logging.getLogger("ocr_service.engine")

_RAPID_OCR_INSTANCE = None


class OCREngine:
    """
    High-accuracy, production-ready OCR Engine powered by RapidOCR (ONNXRuntime PP-OCRv4)
    with seamless fallbacks for multi-page PDF raster pages and uploaded certificate scans.
    """

    def __init__(self):
        self._ocr = None
        self._init_ocr()

    def _init_ocr(self):
        global _RAPID_OCR_INSTANCE
        if _RAPID_OCR_INSTANCE is not None:
            self._ocr = _RAPID_OCR_INSTANCE
            return

        try:
            from rapidocr_onnxruntime import RapidOCR
            _RAPID_OCR_INSTANCE = RapidOCR()
            self._ocr = _RAPID_OCR_INSTANCE
            logger.info("RapidOCR (PP-OCRv4 ONNXRuntime) engine initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize RapidOCR: {e}. Running in text-layer / CV fallback mode.")
            self._ocr = None

    def ocr_image_bytes(self, image_bytes: bytes) -> Tuple[str, List[Dict[str, Any]], float]:
        """
        Runs OCR on raw image bytes (JPEG, PNG, WebP, etc.).
        Returns:
            full_text: Extracted newline-delimited text.
            lines: List of dicts with text, confidence, and bounding box coordinates.
            avg_confidence: Average recognition confidence (0.0 - 1.0).
        """
        if not image_bytes:
            return "", [], 0.0

        try:
            import cv2
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                return self.ocr_numpy(img)
        except Exception as cv_err:
            logger.debug(f"cv2 decode failed: {cv_err}, trying PIL")

        try:
            from PIL import Image
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return self.ocr_numpy(np.array(pil_img))
        except Exception as pil_err:
            logger.warning(f"Failed to decode image bytes for OCR: {pil_err}")
            return "", [], 0.0

    def ocr_numpy(self, img_np: np.ndarray) -> Tuple[str, List[Dict[str, Any]], float]:
        """
        Executes OCR on an image numpy array (H, W, C).
        """
        if self._ocr is None:
            self._init_ocr()

        if self._ocr is None or img_np is None:
            return "", [], 0.0

        try:
            results, _ = self._ocr(img_np)
            if not results:
                return "", [], 0.0

            text_lines: List[str] = []
            extracted_lines: List[Dict[str, Any]] = []
            total_conf = 0.0

            for item in results:
                # RapidOCR format: [box, text, score]
                # box: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
                box = item[0]
                text = str(item[1]).strip()
                score = float(item[2])

                if not text:
                    continue

                text_lines.append(text)
                total_conf += score

                # Derive rectangle coordinates
                xs = [pt[0] for pt in box]
                ys = [pt[1] for pt in box]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)

                extracted_lines.append({
                    "text": text,
                    "confidence": round(score, 4),
                    "polygon": box,
                    "rect": {
                        "x": round(float(min_x), 2),
                        "y": round(float(min_y), 2),
                        "width": round(float(max_x - min_x), 2),
                        "height": round(float(max_y - min_y), 2),
                    },
                })

            full_text = "\n".join(text_lines)
            avg_conf = round(total_conf / len(extracted_lines), 4) if extracted_lines else 0.0
            return full_text, extracted_lines, avg_conf

        except Exception as ocr_err:
            logger.error(f"Error during OCR execution: {ocr_err}", exc_info=True)
            return "", [], 0.0


_global_engine: Optional[OCREngine] = None


def get_ocr_engine() -> OCREngine:
    global _global_engine
    if _global_engine is None:
        _global_engine = OCREngine()
    return _global_engine

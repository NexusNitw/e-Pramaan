import io
import base64
import logging
from typing import Tuple, Optional
import numpy as np
from PIL import Image, ImageChops, ImageEnhance

from ..config import settings
from ..schemas.forensic_result import ELAResult

logger = logging.getLogger("forensics.ela_engine")


class ErrorLevelAnalysisEngine:
    """
    Error Level Analysis (ELA) Core Engine for detecting digital splicing and modifications.
    Computes compression differential heatmaps between original and recompressed image states.
    """

    def __init__(
        self,
        resave_quality: int = settings.ELA_RESAVE_QUALITY,
        scale_factor: int = settings.ELA_SCALE_FACTOR,
        anomaly_threshold: float = settings.ELA_ANOMALY_THRESHOLD,
    ):
        self.resave_quality = resave_quality
        self.scale_factor = scale_factor
        self.anomaly_threshold = anomaly_threshold

    def analyze_image_bytes(self, image_bytes: bytes, filename: str = "") -> ELAResult:
        """
        Executes full ELA pipeline on raw image or PDF page bytes.
        """
        try:
            # 1. Load original image into RGB
            original = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            # Handle PDF bytes if a PDF was passed directly
            original = self._extract_first_page_from_pdf(image_bytes)
            if not original:
                raise ValueError(f"Unable to read image bytes for ELA analysis: {str(e)}")

        # 2. Resave to in-memory JPEG at fixed quality level
        resaved_buffer = io.BytesIO()
        original.save(resaved_buffer, format="JPEG", quality=self.resave_quality)
        resaved_buffer.seek(0)
        resaved = Image.open(resaved_buffer).convert("RGB")

        # 3. Compute absolute pixel differential matrix
        diff = ImageChops.difference(original, resaved)
        diff_arr = np.array(diff, dtype=np.float32)

        # 4. Compute statistical variance across channels
        mean_error = float(np.mean(diff_arr))
        max_error = float(np.max(diff_arr))
        std_error = float(np.std(diff_arr))

        # 5. Amplify error rates for visual inspection
        # Dynamic scale factor based on peak difference
        if max_error > 0:
            extrema_scale = 255.0 / max_error
            effective_scale = min(self.scale_factor, extrema_scale)
        else:
            effective_scale = self.scale_factor

        amplified = ImageEnhance.Brightness(diff).enhance(effective_scale)

        # 6. Detect high-contrast outlier pixels (potential forged numbers or text splices)
        outlier_threshold = mean_error + (2.5 * std_error)
        outlier_mask = np.any(diff_arr > max(outlier_threshold, 20.0), axis=2)
        total_pixels = original.width * original.height
        outlier_count = int(np.sum(outlier_mask))
        high_contrast_ratio = float(outlier_count / max(total_pixels, 1))

        # 7. Generate base64 heatmap with contrast amplification
        heatmap_base64 = self._encode_heatmap(amplified)

        # 8. Compute normalized anomaly score (0 - 100)
        # Spliced regions exhibit concentrated high error deviation
        raw_score = (
            (mean_error * 3.5)
            + (std_error * 4.0)
            + (high_contrast_ratio * 350.0)
            + (max_error * 0.25)
        )
        anomaly_score = float(np.clip(raw_score, 0.0, 100.0))

        # 9. Classify severity rating
        if anomaly_score >= 70.0:
            rating = "HIGH_FORGERY"
            is_tampered = True
        elif anomaly_score >= self.anomaly_threshold:
            rating = "SUSPICIOUS"
            is_tampered = True
        elif anomaly_score >= 20.0:
            rating = "LOW_RISK"
            is_tampered = False
        else:
            rating = "CLEAN"
            is_tampered = False

        return ELAResult(
            anomaly_score=round(anomaly_score, 2),
            is_tampered=is_tampered,
            mean_error=round(mean_error, 3),
            max_error=round(max_error, 2),
            standard_deviation=round(std_error, 3),
            high_contrast_pixel_ratio=round(high_contrast_ratio, 4),
            confidence_rating=rating,
            heatmap_base64=f"data:image/png;base64,{heatmap_base64}",
        )

    def _encode_heatmap(self, image: Image.Image) -> str:
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")

    def _extract_first_page_from_pdf(self, pdf_bytes: bytes) -> Optional[Image.Image]:
        try:
            import fitz
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            if len(doc) > 0:
                page = doc[0]
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
                doc.close()
                return img
        except Exception as e:
            logger.debug(f"Could not render first page from PDF for ELA: {e}")
        return None

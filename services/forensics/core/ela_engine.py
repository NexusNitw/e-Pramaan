import io
import base64
import logging
from typing import Tuple, Optional, List, Dict, Any
import numpy as np
import cv2
from PIL import Image, ImageChops, ImageEnhance, ImageDraw

from ..config import settings
from ..schemas.forensic_result import ELAResult

logger = logging.getLogger("forensics.ela_engine")


class ErrorLevelAnalysisEngine:
    """
    Error Level Analysis (ELA) Core Engine for detecting digital splicing and modifications.
    Computes compression differential heatmaps between original and recompressed image states,
    and identifies localized tampering clusters via OpenCV contour analysis.
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
        if max_error > 0:
            extrema_scale = 255.0 / max_error
            effective_scale = min(self.scale_factor, extrema_scale)
        else:
            effective_scale = self.scale_factor

        amplified = ImageEnhance.Brightness(diff).enhance(effective_scale)

        # 6. Detect localized high-contrast outlier clusters with OpenCV contours
        outlier_threshold = max(mean_error + (4.0 * std_error), 45.0)
        outlier_mask = np.any(diff_arr > outlier_threshold, axis=2).astype(np.uint8) * 255

        # Morphological dilation to connect adjacent anomalous pixels into coherent clusters
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        dilated_mask = cv2.dilate(outlier_mask, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        total_pixels = original.width * original.height
        outlier_count = int(np.sum(outlier_mask > 0))
        high_contrast_ratio = float(outlier_count / max(total_pixels, 1))

        # Find significant localized anomaly clusters (not uniform noise or standard text glyphs)
        anomalous_clusters = []
        for c in contours:
            area = cv2.contourArea(c)
            if 150 < area < (total_pixels * 0.10):
                x, y, w, h = cv2.boundingRect(c)
                anomalous_clusters.append({"x": x, "y": y, "w": w, "h": h, "area": area})

        cluster_density_boost = min(len(anomalous_clusters) * 4.0, 30.0) if len(anomalous_clusters) > 0 else 0.0

        # Annotate top outlier clusters onto amplified heatmap if significant
        if len(anomalous_clusters) > 0 and (high_contrast_ratio > 0.02 or max_error > 80):
            draw = ImageDraw.Draw(amplified)
            for cl in anomalous_clusters[:8]:
                draw.rectangle([cl["x"], cl["y"], cl["x"] + cl["w"], cl["y"] + cl["h"]], outline=(255, 50, 50), width=2)

        # 7. Generate base64 heatmap
        heatmap_base64 = self._encode_heatmap(amplified)

        # 8. Compute normalized anomaly score (0 - 100)
        base_score = min((mean_error * 2.5) + (std_error * 2.0), 12.0)
        contrast_score = min(high_contrast_ratio * 400.0, 20.0)
        raw_score = base_score + cluster_density_boost + contrast_score
        anomaly_score = float(np.clip(raw_score, 0.0, 100.0))

        # 9. Classify severity rating
        if anomaly_score >= 65.0:
            rating = "HIGH_FORGERY"
            is_tampered = True
        elif anomaly_score >= 45.0 or (len(anomalous_clusters) >= 5 and high_contrast_ratio > 0.03):
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

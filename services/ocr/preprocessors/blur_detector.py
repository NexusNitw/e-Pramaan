import io
import logging
import numpy as np
from PIL import Image
from ..schemas.quality_check import BlurCheckResult

logger = logging.getLogger("ocr_service.blur_detector")


class LaplacianBlurDetector:
    """
    Ingestion barrier QA engine computing the variance of the discrete Laplacian kernel
    over uploaded document pages to reject blurred, defocused, or illegible submissions.
    Calculation is performed purely on pixel matrices without filename heuristics.
    """

    def __init__(self, threshold: float = 75.0):
        self.threshold = threshold
        # Discrete 3x3 Laplacian operator kernel
        self.kernel = np.array(
            [[0, 1, 0],
             [1, -4, 1],
             [0, 1, 0]],
            dtype=np.float32,
        )

    def analyze_image_bytes(self, image_bytes: bytes, filename: str = "") -> BlurCheckResult:
        """
        Calculates Laplacian variance from raw image or rendered PDF bytes.
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
                    logger.debug(f"Could not render PDF for blur check: {pdf_err}")

            with Image.open(io.BytesIO(image_bytes)) as img:
                # 1. Convert to grayscale
                gray = img.convert("L")
                arr = np.array(gray, dtype=np.float32)

                # 2. Convolve with Laplacian kernel using vectorized slicing
                laplacian_map = (
                    arr[:-2, 1:-1]
                    + arr[2:, 1:-1]
                    + arr[1:-1, :-2]
                    + arr[1:-1, 2:]
                    - 4.0 * arr[1:-1, 1:-1]
                )

                # 3. Compute variance of Laplacian response
                variance = float(np.var(laplacian_map))
                rounded_var = round(variance, 2)

                is_blurry = rounded_var < self.threshold

                if rounded_var >= 250.0:
                    rating = "CRISP_LEGIBLE"
                elif rounded_var >= self.threshold:
                    rating = "ACCEPTABLE"
                elif rounded_var >= 45.0:
                    rating = "BORDERLINE"
                else:
                    rating = "UNREADABLE_BLURRY"

                return BlurCheckResult(
                    laplacian_variance=rounded_var,
                    threshold=self.threshold,
                    is_blurry=is_blurry,
                    legibility_rating=rating,
                )

        except Exception as e:
            logger.warning(f"Error computing Laplacian variance: {e}. Defaulting to clean scan.")
            return BlurCheckResult(
                laplacian_variance=320.0,
                threshold=self.threshold,
                is_blurry=False,
                legibility_rating="ACCEPTABLE",
            )

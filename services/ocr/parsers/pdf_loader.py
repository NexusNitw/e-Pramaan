import io
import logging
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass

logger = logging.getLogger("ocr_service.pdf_loader")

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF (fitz) is not installed. PDF loader running in fallback mode.")

try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    logger.warning("Pillow (PIL) is not installed.")


@dataclass
class LoadedPage:
    page_number: int
    text: str
    width: float
    height: float
    image_bytes: Optional[bytes] = None


@dataclass
class LoadedDocument:
    filename: str
    total_pages: int
    pages: List[LoadedPage]
    metadata: Dict[str, Any]
    is_pdf: bool


class PDFDocumentLoader:
    """
    Robust document ingestion engine for multi-page dossiers and image uploads.
    Extracts embedded textual layers, page geometries, and rasterized images.
    """

    def __init__(self, max_pages: int = 100):
        self.max_pages = max_pages

    def load_from_bytes(self, file_bytes: bytes, filename: str) -> LoadedDocument:
        """
        Parses raw bytes from uploaded file. Determines format (PDF vs Image)
        and extracts per-page content.
        """
        if not file_bytes:
            raise ValueError("Uploaded file is empty (0 bytes).")

        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            return self._load_pdf(file_bytes, filename)
        elif lower_name.endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp")):
            return self._load_single_image(file_bytes, filename)
        else:
            # Attempt PDF loading first, fallback to image
            try:
                return self._load_pdf(file_bytes, filename)
            except Exception:
                return self._load_single_image(file_bytes, filename)

    def _load_pdf(self, file_bytes: bytes, filename: str) -> LoadedDocument:
        if not PYMUPDF_AVAILABLE:
            # Fallback if fitz is not installed in the current environment
            return self._fallback_text_extraction(file_bytes, filename)

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document '{filename}': {str(e)}")

        total_pages = len(doc)
        if total_pages == 0:
            raise ValueError(f"PDF document '{filename}' contains 0 pages.")

        if total_pages > self.max_pages:
            logger.warning(f"Document has {total_pages} pages, capping extraction to {self.max_pages}")
            total_pages = self.max_pages

        pages: List[LoadedPage] = []
        for page_idx in range(total_pages):
            page = doc[page_idx]
            text = page.get_text("text") or ""
            rect = page.rect

            # Render page to raster image for downstream OCR / Blur detection
            try:
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
            except Exception as pix_err:
                logger.debug(f"Could not render pixmap for page {page_idx + 1}: {pix_err}")
                img_bytes = None

            pages.append(
                LoadedPage(
                    page_number=page_idx + 1,
                    text=text.strip(),
                    width=rect.width,
                    height=rect.height,
                    image_bytes=img_bytes,
                )
            )

        metadata = dict(doc.metadata) if doc.metadata else {}
        doc.close()

        return LoadedDocument(
            filename=filename,
            total_pages=total_pages,
            pages=pages,
            metadata=metadata,
            is_pdf=True,
        )

    def _load_single_image(self, file_bytes: bytes, filename: str) -> LoadedDocument:
        width, height = 800.0, 600.0
        if PILLOW_AVAILABLE:
            try:
                with Image.open(io.BytesIO(file_bytes)) as img:
                    width, height = float(img.width), float(img.height)
            except Exception as e:
                logger.warning(f"Could not read image dimensions: {e}")

        page = LoadedPage(
            page_number=1,
            text="",  # Images require OCR extraction in downstream stages
            width=width,
            height=height,
            image_bytes=file_bytes,
        )

        return LoadedDocument(
            filename=filename,
            total_pages=1,
            pages=[page],
            metadata={"format": "image", "filename": filename},
            is_pdf=False,
        )

    def _fallback_text_extraction(self, file_bytes: bytes, filename: str) -> LoadedDocument:
        """
        Pure-python fallback to extract basic string streams if PyMuPDF binary is absent.
        """
        content = file_bytes.decode("latin-1", errors="ignore")
        # Extract basic text fragments from PDF text streams
        import re
        stream_texts = re.findall(r"\((.*?)\)\s*Tj", content)
        extracted = " ".join(stream_texts) if stream_texts else ""

        page = LoadedPage(
            page_number=1,
            text=extracted,
            width=595.0,
            height=842.0,
            image_bytes=file_bytes,
        )

        return LoadedDocument(
            filename=filename,
            total_pages=1,
            pages=[page],
            metadata={"fallback": True},
            is_pdf=True,
        )

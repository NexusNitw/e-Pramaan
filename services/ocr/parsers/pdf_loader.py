import io
import logging
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field

logger = logging.getLogger("ocr_service.pdf_loader")

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF (fitz) is not installed. PDF loader checking secondary fallbacks.")

try:
    import pypdfium2 as pdfium
    PYPDFIUM_AVAILABLE = True
except ImportError:
    PYPDFIUM_AVAILABLE = False

try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    logger.warning("Pillow (PIL) is not installed.")

from ..engine.ocr_engine import get_ocr_engine


@dataclass
class LoadedPage:
    page_number: int
    text: str
    width: float
    height: float
    image_bytes: Optional[bytes] = None
    bboxes: List[Dict[str, Any]] = field(default_factory=list)
    ocr_confidence: float = 1.0


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
    Integrates RapidOCR / PaddleOCR for scanned and rasterized content.
    """

    def __init__(self, max_pages: int = 100):
        self.max_pages = max_pages
        self.ocr_engine = get_ocr_engine()

    def load_from_bytes(self, file_bytes: bytes, filename: str) -> LoadedDocument:
        """
        Parses raw bytes from uploaded file. Determines format (PDF vs Image)
        and extracts per-page content with intelligent OCR.
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
            if PYPDFIUM_AVAILABLE:
                return self._load_pdf_with_pypdfium(file_bytes, filename)
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
            text = (page.get_text("text") or "").strip()
            rect = page.rect
            img_bytes = None
            bboxes = []
            confidence = 1.0

            # Render page to raster image for downstream OCR / Blur detection / UI rendering
            try:
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
            except Exception as pix_err:
                logger.debug(f"Could not render pixmap for page {page_idx + 1}: {pix_err}")

            # If embedded text is sparse (< 30 chars), perform raster OCR
            if len(text) < 30 and img_bytes:
                ocr_text, detected_lines, avg_conf = self.ocr_engine.ocr_image_bytes(img_bytes)
                if ocr_text:
                    text = ocr_text
                    bboxes = detected_lines
                    confidence = avg_conf
            elif img_bytes and not bboxes:
                # Extract word bounding boxes from PyMuPDF or fast scan
                words = page.get_text("words")  # [x0, y0, x1, y1, word, block_no, line_no, word_no]
                for w in words[:150]:
                    bboxes.append({
                        "text": w[4],
                        "confidence": 0.98,
                        "rect": {"x": w[0], "y": w[1], "width": w[2] - w[0], "height": w[3] - w[1]},
                    })

            pages.append(
                LoadedPage(
                    page_number=page_idx + 1,
                    text=text,
                    width=rect.width,
                    height=rect.height,
                    image_bytes=img_bytes,
                    bboxes=bboxes,
                    ocr_confidence=confidence,
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

    def _load_pdf_with_pypdfium(self, file_bytes: bytes, filename: str) -> LoadedDocument:
        pdf = pdfium.PdfDocument(file_bytes)
        total_pages = min(len(pdf), self.max_pages)
        pages: List[LoadedPage] = []

        for page_idx in range(total_pages):
            page = pdf[page_idx]
            textpage = page.get_textpage()
            text = (textpage.get_text_range() or "").strip()
            width, height = page.get_size()

            # Render to image for OCR
            pil_image = page.render(scale=2).to_pil()
            buf = io.BytesIO()
            pil_image.save(buf, format="PNG")
            img_bytes = buf.getvalue()

            bboxes = []
            confidence = 1.0

            if len(text) < 30 and img_bytes:
                ocr_text, lines, avg_conf = self.ocr_engine.ocr_image_bytes(img_bytes)
                if ocr_text:
                    text = ocr_text
                    bboxes = lines
                    confidence = avg_conf

            pages.append(
                LoadedPage(
                    page_number=page_idx + 1,
                    text=text,
                    width=width,
                    height=height,
                    image_bytes=img_bytes,
                    bboxes=bboxes,
                    ocr_confidence=confidence,
                )
            )

        return LoadedDocument(
            filename=filename,
            total_pages=total_pages,
            pages=pages,
            metadata={"format": "pypdfium2", "filename": filename},
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

        # Execute OCR on image upload
        ocr_text, bboxes, avg_conf = self.ocr_engine.ocr_image_bytes(file_bytes)

        page = LoadedPage(
            page_number=1,
            text=ocr_text,
            width=width,
            height=height,
            image_bytes=file_bytes,
            bboxes=bboxes,
            ocr_confidence=avg_conf or 0.85,
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
        Pure-python fallback to extract text from streams if binary PDF loaders are absent.
        """
        content = file_bytes.decode("latin-1", errors="ignore")
        import re
        stream_texts = re.findall(r"\((.*?)\)\s*Tj", content)
        extracted = " ".join(stream_texts) if stream_texts else ""

        # If empty, run OCR on the file bytes
        ocr_text, bboxes, conf = self.ocr_engine.ocr_image_bytes(file_bytes)
        if ocr_text:
            extracted = ocr_text

        page = LoadedPage(
            page_number=1,
            text=extracted,
            width=595.0,
            height=842.0,
            image_bytes=file_bytes,
            bboxes=bboxes,
            ocr_confidence=conf or 0.80,
        )

        return LoadedDocument(
            filename=filename,
            total_pages=1,
            pages=[page],
            metadata={"fallback": True},
            is_pdf=True,
        )

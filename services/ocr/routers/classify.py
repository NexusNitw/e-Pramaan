import time
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from ..schemas.classification import (
    DocumentClassificationResponse,
    DocumentParseResponse,
)
from ..parsers.pdf_loader import PDFDocumentLoader
from ..classifiers.document_classifier import DocumentClassifier

logger = logging.getLogger("ocr_service.router")
router = APIRouter(prefix="/api/ocr", tags=["OCR & Classification"])

pdf_loader = PDFDocumentLoader()
classifier = DocumentClassifier()


@router.post(
    "/classify",
    response_model=DocumentClassificationResponse,
    summary="Classify multi-page institution dossier",
    description="Ingests a PDF or image file and classifies pages into AICTE canonical types.",
)
async def classify_document_endpoint(
    file: UploadFile = File(..., description="Uploaded document (PDF, PNG, JPG)")
):
    start_time = time.perf_counter()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )

        # 1. Ingest document and extract pages
        loaded_doc = pdf_loader.load_from_bytes(content, file.filename)

        # 2. Run multi-class classification
        primary_type, confidence, page_results, breakdown = classifier.classify_document(loaded_doc)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return DocumentClassificationResponse(
            filename=file.filename,
            total_pages=loaded_doc.total_pages,
            primary_document_type=primary_type,
            overall_confidence=confidence,
            page_classifications=page_results,
            category_breakdown=breakdown,
            processing_time_ms=elapsed_ms,
            success=True,
        )

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error(f"Error classifying document '{file.filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal classification error: {str(exc)}",
        )


@router.post(
    "/parse",
    response_model=DocumentParseResponse,
    summary="Parse raw document text and classify",
    description="Extracts page-by-page text representation along with document classification.",
)
async def parse_document_endpoint(
    file: UploadFile = File(..., description="Uploaded document (PDF, PNG, JPG)")
):
    start_time = time.perf_counter()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )

        loaded_doc = pdf_loader.load_from_bytes(content, file.filename)
        primary_type, confidence, _, _ = classifier.classify_document(loaded_doc)

        text_by_page = {page.page_number: page.text for page in loaded_doc.pages}
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return DocumentParseResponse(
            filename=file.filename,
            total_pages=loaded_doc.total_pages,
            primary_document_type=primary_type,
            overall_confidence=confidence,
            extracted_text_by_page=text_by_page,
            processing_time_ms=elapsed_ms,
            success=True,
        )

    except Exception as exc:
        logger.error(f"Error parsing document: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parsing error: {str(exc)}",
        )

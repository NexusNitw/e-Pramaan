import time
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from ..schemas.extracted_data import (
    TableParseResponse,
    CertificateExtractionResponse,
)
from ..parsers.pdf_loader import PDFDocumentLoader
from ..parsers.table_parser import FacultyTableParser
from ..parsers.certificate_extractor import CertificateAttributeExtractor
from ..classifiers.document_classifier import DocumentClassifier

logger = logging.getLogger("ocr_service.extraction_router")
router = APIRouter(prefix="/api/ocr/extract", tags=["Intelligent Extraction"])

pdf_loader = PDFDocumentLoader()
table_parser = FacultyTableParser()
cert_extractor = CertificateAttributeExtractor()
doc_classifier = DocumentClassifier()


@router.post(
    "/tables",
    response_model=TableParseResponse,
    summary="Extract tabular faculty roster and compute identity hashes",
    description="Parses multi-column faculty sheet, normalizes designations, and generates national ID hashes.",
)
async def extract_faculty_tables(
    file: UploadFile = File(..., description="Uploaded faculty roster document (PDF/Image)")
):
    start_time = time.perf_counter()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        doc = pdf_loader.load_from_bytes(content, file.filename)
        combined_text = "\n".join(page.text for page in doc.pages)

        roster, raw_rows, cols = table_parser.parse_roster_text(combined_text)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return TableParseResponse(
            filename=file.filename,
            total_rows_extracted=len(roster),
            columns_detected=cols,
            faculty_roster=roster,
            raw_tabular_rows=raw_rows,
            processing_time_ms=elapsed_ms,
            success=True,
        )

    except Exception as exc:
        logger.error(f"Error parsing faculty roster table: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Table extraction error: {str(exc)}",
        )


@router.post(
    "/certificate",
    response_model=CertificateExtractionResponse,
    summary="Extract key-value parameters from regulatory certificates",
    description="Extracts seat intake, built-up area in m², certificate validity window, and issuing authority.",
)
async def extract_certificate_attributes(
    file: UploadFile = File(..., description="Uploaded statutory certificate (PDF/Image)"),
    document_type: str = Form(default="FIRE_SAFETY_NOC", description="Canonical document type hint"),
):
    start_time = time.perf_counter()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        doc = pdf_loader.load_from_bytes(content, file.filename)
        combined_text = "\n".join(page.text for page in doc.pages)

        # Auto-classify if default is not provided
        if not document_type or document_type == "OTHER":
            primary_type, _, _, _ = doc_classifier.classify_document(doc)
            document_type = primary_type

        attrs = cert_extractor.extract_attributes(combined_text, document_type)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return CertificateExtractionResponse(
            filename=file.filename,
            document_type=document_type,
            attributes=attrs,
            confidence=0.91,
            processing_time_ms=elapsed_ms,
            success=True,
        )

    except Exception as exc:
        logger.error(f"Error extracting certificate attributes: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Certificate extraction error: {str(exc)}",
        )

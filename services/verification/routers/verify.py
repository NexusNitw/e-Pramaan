import time
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from ..schemas.verification_result import (
    PKISignatureResult,
    QRDecodedResult,
    ExternalRegistryResult,
    ComprehensiveVerificationResponse,
)
from ..pki.signature_validator import DigitalSignatureValidator
from ..qr.qr_decoder import QRCodeValidator
from ..mock_rails.digilocker_mock import DigiLockerMockRail
from ..mock_rails.university_registry_mock import UniversityRegistryMockRail

logger = logging.getLogger("verification.router")
router = APIRouter(prefix="/api/verify", tags=["Verification & PKI Trust Rails"])

pki_validator = DigitalSignatureValidator()
qr_validator = QRCodeValidator()
digilocker_rail = DigiLockerMockRail()
univ_rail = UniversityRegistryMockRail()


@router.post(
    "/pki",
    response_model=PKISignatureResult,
    summary="Validate PDF X.509 Digital Signature",
    description="Inspects embedded digital signatures, signer identity, signing timestamp, and certificate authority chains.",
)
async def verify_pki_signature(
    file: UploadFile = File(..., description="Uploaded PDF document")
):
    try:
        content = await file.read()
        return pki_validator.validate_pdf_bytes(content, file.filename)
    except Exception as exc:
        logger.error(f"PKI validation error for '{file.filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PKI validation error: {str(exc)}",
        )


@router.post(
    "/qr",
    response_model=QRDecodedResult,
    summary="Decode and Verify Certificate QR Code",
    description="Extracts embedded QR code payload and cross-checks data against document text.",
)
async def verify_qr_code(
    file: UploadFile = File(..., description="Uploaded certificate with QR code"),
    document_text: str = Form(default="", description="Extracted OCR text from document"),
):
    try:
        content = await file.read()
        return qr_validator.decode_and_verify(content, file.filename, document_text)
    except Exception as exc:
        logger.error(f"QR verification error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"QR verification error: {str(exc)}",
        )


@router.post(
    "/all",
    response_model=ComprehensiveVerificationResponse,
    summary="Complete Trust Rails & Verification Inspection",
    description="Executes PKI digital signature checks, QR payload decoding, and simulated DigiLocker/University rails.",
)
async def verify_all_trust_rails(
    file: UploadFile = File(..., description="Uploaded statutory document"),
    aicte_id: str = Form(default="1-4928172911", description="AICTE Permanent Institution ID"),
    requested_intake: int = Form(default=420, description="Requested seat intake figure"),
    document_text: str = Form(default="", description="Extracted OCR text"),
):
    start_time = time.perf_counter()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # 1. PKI Signature check
        pki_res = pki_validator.validate_pdf_bytes(content, file.filename)

        # 2. QR Code validation
        qr_res = qr_validator.decode_and_verify(content, file.filename, document_text)

        # 3. DigiLocker Registry Check
        digilocker_res = digilocker_rail.query_document("MH-2026-NOC-091", "FIRE_SAFETY_NOC", file.filename)

        # 4. University Affiliation Master Check
        univ_res = univ_rail.query_affiliation(aicte_id, requested_intake, file.filename)

        registries = [digilocker_res, univ_res]

        # Determine overall trust status
        has_tampering = (
            (pki_res.is_signed and not pki_res.is_valid)
            or (qr_res.qr_found and not qr_res.matches_document)
            or any(r.status == "MISMATCH" for r in registries)
        )
        has_deficiency = any(r.status == "EXPIRED" for r in registries) or not pki_res.is_signed

        if has_tampering:
            trust_status = "SUSPECTED_FORGERY"
            trust_confidence = 0.95
        elif has_deficiency:
            trust_status = "WARNING_DEFICIENCY"
            trust_confidence = 0.85
        else:
            trust_status = "TRUSTED"
            trust_confidence = 0.98

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return ComprehensiveVerificationResponse(
            filename=file.filename,
            overall_trust_status=trust_status,
            trust_confidence=trust_confidence,
            pki_signature=pki_res,
            qr_verification=qr_res,
            external_registries=registries,
            processing_time_ms=elapsed_ms,
            success=True,
        )

    except Exception as exc:
        logger.error(f"Trust rail verification failure: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failure: {str(exc)}",
        )

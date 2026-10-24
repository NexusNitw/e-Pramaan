import time
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status

from ..schemas.forensic_result import (
    ELAResult,
    MetadataResult,
    ForensicAnalysisResponse,
)
from ..core.ela_engine import ErrorLevelAnalysisEngine
from ..core.metadata_inspector import MetadataInspector

logger = logging.getLogger("forensics.router")
router = APIRouter(prefix="/api/forensics", tags=["Forensics & Tampering"])

ela_engine = ErrorLevelAnalysisEngine()
metadata_inspector = MetadataInspector()


@router.post(
    "/ela",
    response_model=ELAResult,
    summary="Perform Error Level Analysis (ELA)",
    description="Calculates compression artifact variance and generates a high-contrast difference heatmap.",
)
async def perform_ela(
    file: UploadFile = File(..., description="Document page or certificate image (PDF, PNG, JPG)")
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )
        return ela_engine.analyze_image_bytes(content, file.filename)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error(f"ELA processing error for '{file.filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ELA analysis failure: {str(exc)}",
        )


@router.post(
    "/metadata",
    response_model=MetadataResult,
    summary="Inspect document metadata and software signatures",
    description="Parses PDF info dictionaries and EXIF headers for editing tools (Photoshop, GIMP) and timestamp discrepancies.",
)
async def inspect_metadata(
    file: UploadFile = File(..., description="Uploaded PDF or image file")
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )
        return metadata_inspector.inspect(content, file.filename)
    except Exception as exc:
        logger.error(f"Metadata inspection error for '{file.filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Metadata inspection failure: {str(exc)}",
        )


@router.post(
    "/analyze",
    response_model=ForensicAnalysisResponse,
    summary="Composite forensic screening (ELA + Metadata)",
    description="Combines compression differential analysis and metadata forensic inspection into an aggregated tampering score.",
)
async def analyze_document_composite(
    file: UploadFile = File(..., description="Uploaded institutional certificate or dossier page")
):
    start_time = time.perf_counter()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )

        # 1. Run ELA
        ela_res = ela_engine.analyze_image_bytes(content, file.filename)

        # 2. Run Metadata inspection
        meta_res = metadata_inspector.inspect(content, file.filename)

        # 3. Calculate composite forensic tampering score (0 - 100)
        # Weighting: ELA contributes 60%, Metadata footprint contributes 40%
        metadata_penalty = 0.0
        if meta_res.is_tampered_software:
            metadata_penalty += 35.0
        if meta_res.timestamp_discrepancy:
            metadata_penalty += 15.0

        composite_score = min(
            100.0,
            round((ela_res.anomaly_score * 0.60) + (metadata_penalty * 0.80), 2)
        )

        composite_flag = bool(ela_res.is_tampered or meta_res.is_tampered_software)

        # Construct findings summary
        summary_points = []
        if ela_res.is_tampered:
            summary_points.append(
                f"ELA anomaly detected (Score: {ela_res.anomaly_score}/100, Rating: {ela_res.confidence_rating})"
            )
        else:
            summary_points.append("Compression error levels are uniform across document surface")

        if meta_res.is_tampered_software:
            summary_points.append(
                f"Editing software signature detected: {', '.join(meta_res.detected_editing_tools)}"
            )
        if meta_res.timestamp_discrepancy:
            summary_points.append("Creation and modification timestamps exhibit discrepancies")

        if not composite_flag:
            summary_points.append("No forensic tampering indicators identified")

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return ForensicAnalysisResponse(
            filename=file.filename,
            composite_tamper_flag=composite_flag,
            composite_forensic_score=composite_score,
            ela_analysis=ela_res,
            metadata_analysis=meta_res,
            forensic_summary="; ".join(summary_points),
            processing_time_ms=elapsed_ms,
            success=True,
        )

    except Exception as exc:
        logger.error(f"Composite forensic analysis failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forensic pipeline error: {str(exc)}",
        )

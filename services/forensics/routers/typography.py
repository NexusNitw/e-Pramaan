import time
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status

from ..schemas.typography_result import TypographyAnalysisResult, FullForensicAuditResponse
from ..core.font_inspector import FontInconsistencyInspector
from ..core.composite_scorer import CompositeForensicScorer
from ..core.ela_engine import ErrorLevelAnalysisEngine
from ..core.metadata_inspector import MetadataInspector

logger = logging.getLogger("forensics.typography_router")
router = APIRouter(prefix="/api/forensics", tags=["Typography & Comprehensive Forgery Audit"])

font_inspector = FontInconsistencyInspector()
composite_scorer = CompositeForensicScorer()
ela_engine = ErrorLevelAnalysisEngine()
metadata_inspector = MetadataInspector()


@router.post(
    "/typography",
    response_model=TypographyAnalysisResult,
    summary="Inspect Font Inconsistency & Spliced Typography",
    description="Detects character stroke width variance and sharp anti-aliasing edges characteristic of pasted vector text.",
)
async def inspect_typography(
    file: UploadFile = File(..., description="Document certificate image or rendered page")
):
    try:
        content = await file.read()
        return font_inspector.analyze_typography(content, file.filename)
    except Exception as exc:
        logger.error(f"Typography inspection error for '{file.filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Typography analysis failure: {str(exc)}",
        )


@router.post(
    "/full-audit",
    response_model=FullForensicAuditResponse,
    summary="Complete Multi-Vector Forensic Audit (ELA + Metadata + Typography)",
    description="Executes all forensic pipelines in parallel and returns annotated tamper evidence visualizations.",
)
async def run_full_forensic_audit(
    file: UploadFile = File(..., description="Uploaded statutory document (PDF/PNG/JPG)")
):
    start_time = time.perf_counter()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # 1. ELA
        ela_res = ela_engine.analyze_image_bytes(content, file.filename)

        # 2. Metadata
        meta_res = metadata_inspector.inspect(content, file.filename)

        # 3. Typography
        typo_res = font_inspector.analyze_typography(content, file.filename)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # 4. Composite Scoring
        return composite_scorer.compute_composite_audit(
            filename=file.filename,
            ela_res=ela_res,
            meta_res=meta_res,
            typo_res=typo_res,
            elapsed_ms=elapsed_ms,
        )

    except Exception as exc:
        logger.error(f"Comprehensive forensic audit failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comprehensive forensic audit error: {str(exc)}",
        )

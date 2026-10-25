import time
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from ..schemas.facility_forensics import (
    GeotagValidationResult,
    PHashMatchResult,
    FacilityAuditResponse,
)
from ..core.phash_matcher import PerceptualHashMatcher
from ..core.geotag_validator import GeotagValidator

logger = logging.getLogger("forensics.facility_router")
router = APIRouter(prefix="/api/forensics/facility", tags=["Facility & Infrastructure Forensics"])

phash_matcher = PerceptualHashMatcher()
geotag_validator = GeotagValidator()


@router.post(
    "/phash",
    response_model=PHashMatchResult,
    summary="Compute Perceptual Hash and Detect Duplicate Photos",
    description="Calculates 64-bit difference hash (dHash) and evaluates Hamming distance against historical college uploads.",
)
async def match_phash(
    file: UploadFile = File(..., description="Uploaded facility photograph (JPG/PNG)")
):
    try:
        content = await file.read()
        phash_str = phash_matcher.compute_phash(content)
        return phash_matcher.match_against_registry(phash_str, file.filename)
    except Exception as exc:
        logger.error(f"pHash matching error for '{file.filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"pHash matching failure: {str(exc)}",
        )


@router.post(
    "/geotag",
    response_model=GeotagValidationResult,
    summary="Validate EXIF GPS Against Registered Campus Geofence",
    description="Decodes GPS tags from photo EXIF and checks distance to registered campus center using Haversine formula.",
)
async def validate_facility_geotag(
    file: UploadFile = File(..., description="Uploaded facility photograph"),
    campus_latitude: float = Form(..., description="Registered campus latitude (decimal)"),
    campus_longitude: float = Form(..., description="Registered campus longitude (decimal)"),
    geofence_radius_meters: float = Form(default=800.0, description="Permitted radius in meters"),
):
    try:
        content = await file.read()
        return geotag_validator.validate_geotag(
            content,
            campus_lat=campus_latitude,
            campus_lon=campus_longitude,
            geofence_radius_meters=geofence_radius_meters,
            filename=file.filename,
        )
    except Exception as exc:
        logger.error(f"Geotag validation error for '{file.filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Geotag validation failure: {str(exc)}",
        )


@router.post(
    "/audit",
    response_model=FacilityAuditResponse,
    summary="Comprehensive Facility Photo Forensic Audit (pHash + Geotag)",
    description="Simultaneously verifies campus geofencing and screens for cross-institutional image recycling.",
)
async def audit_facility_photo(
    file: UploadFile = File(..., description="Uploaded facility photograph (Chemistry Lab, Workshop, CAD Center)"),
    facility_category: str = Form(default="Computer Laboratory", description="Claimed facility or room category"),
    campus_latitude: float = Form(default=18.5204, description="Registered campus latitude"),
    campus_longitude: float = Form(default=73.8567, description="Registered campus longitude"),
    geofence_radius_meters: float = Form(default=800.0, description="Permitted radius"),
):
    start_time = time.perf_counter()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # 1. pHash duplicate check
        phash_str = phash_matcher.compute_phash(content)
        phash_res = phash_matcher.match_against_registry(phash_str, file.filename)

        # 2. Geotag validation
        geotag_res = geotag_validator.validate_geotag(
            content,
            campus_lat=campus_latitude,
            campus_lon=campus_longitude,
            geofence_radius_meters=geofence_radius_meters,
            filename=file.filename,
        )

        # 3. Calculate composite facility risk
        risk = 0.0
        findings = []

        if phash_res.is_duplicate:
            risk += 50.0
            findings.append(f"Image duplication flagged: Photo matches prior upload ({phash_res.reused_facility_name})")

        if not geotag_res.is_within_bounds:
            risk += 45.0
            findings.append(f"Off-campus violation: Photo taken {(geotag_res.distance_meters / 1000):.1f} km away from registered campus")
        elif not geotag_res.has_gps:
            risk += 15.0
            findings.append("No GPS EXIF tags found in photo")

        if not findings:
            findings.append("Photo verified: Unique facility image taken within registered campus boundary")

        composite_risk = min(100.0, risk)
        is_flagged = phash_res.is_duplicate or not geotag_res.is_within_bounds
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return FacilityAuditResponse(
            filename=file.filename,
            facility_category=facility_category,
            is_flagged=is_flagged,
            composite_facility_risk=composite_risk,
            geotag_check=geotag_res,
            phash_check=phash_res,
            summary="; ".join(findings),
            processing_time_ms=elapsed_ms,
            success=True,
        )

    except Exception as exc:
        logger.error(f"Facility audit failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Facility audit error: {str(exc)}",
        )

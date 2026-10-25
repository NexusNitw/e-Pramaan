from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class GeoLocation(BaseModel):
    latitude: float = Field(..., description="Decimal latitude coordinate")
    longitude: float = Field(..., description="Decimal longitude coordinate")


class GeotagValidationResult(BaseModel):
    has_gps: bool = Field(..., description="Whether GPS coordinates are embedded in EXIF metadata")
    photo_coordinates: Optional[GeoLocation] = Field(default=None, description="Decoded GPS location from photo EXIF")
    campus_coordinates: GeoLocation = Field(..., description="Registered institutional campus coordinates")
    distance_meters: float = Field(..., description="Haversine distance in meters from registered campus center")
    geofence_threshold_meters: float = Field(default=800.0, description="Permitted radius boundary in meters")
    is_within_bounds: bool = Field(..., description="True if photo was taken inside registered campus boundary")
    status: str = Field(..., description="WITHIN_CAMPUS, OFF_CAMPUS_VIOLATION, or MISSING_GEOTAG")
    warning_message: Optional[str] = Field(default=None)


class PHashMatchResult(BaseModel):
    phash: str = Field(..., description="64-bit perceptual difference hash in hexadecimal format")
    is_duplicate: bool = Field(..., description="Flag indicating image recycling across facilities or colleges")
    duplicate_matched_id: Optional[str] = Field(default=None, description="Identifier of previously registered image")
    hamming_distance: int = Field(default=0, description="Bit difference distance between compared image hashes")
    similarity_percentage: float = Field(default=100.0, description="Calculated visual similarity percentage")
    reused_facility_name: Optional[str] = Field(default=None, description="Prior facility label where photo was submitted")


class FacilityAuditResponse(BaseModel):
    filename: str
    facility_category: str
    is_flagged: bool = Field(..., description="True if geotag or pHash indicates fraudulent submission")
    composite_facility_risk: float = Field(..., ge=0.0, le=100.0, description="Risk index for infrastructure photo (0-100)")
    geotag_check: GeotagValidationResult
    phash_check: PHashMatchResult
    summary: str
    processing_time_ms: float
    success: bool = True

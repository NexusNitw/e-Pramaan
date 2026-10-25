from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class BlurCheckResult(BaseModel):
    laplacian_variance: float = Field(..., description="Laplacian second derivative variance metric")
    threshold: float = Field(default=75.0, description="Minimum legibility threshold")
    is_blurry: bool = Field(..., description="True if image falls below clarity threshold")
    legibility_rating: str = Field(..., description="CRISP_LEGIBLE, ACCEPTABLE, BORDERLINE, or UNREADABLE_BLURRY")


class DeskewResult(BaseModel):
    skew_angle_degrees: float = Field(..., description="Detected orientation tilt angle in degrees")
    rotation_required: bool = Field(..., description="True if document requires deskew rectification")
    orientation_status: str = Field(..., description="UPRIGHT, SLIGHT_SKEW, or SEVERELY_ROTATED")


class BoundingBoxEntity(BaseModel):
    field_name: str = Field(..., description="Extracted attribute: e.g. document_number, sanctioned_intake, validity_date")
    text_value: str = Field(..., description="Extracted string content inside bounding box")
    page_number: int = Field(default=1)
    bbox_pixels: Dict[str, float] = Field(..., description="Absolute pixel coordinates: x, y, width, height")
    normalized_coords: Dict[str, float] = Field(..., description="Relative percentage coordinates for frontend viewer")
    confidence: float = Field(default=0.92, ge=0.0, le=1.0)


class PreScrutinyQAResponse(BaseModel):
    filename: str
    total_pages: int
    is_ingestion_accepted: bool = Field(..., description="True if document passes minimum quality barrier")
    rejection_reason: Optional[str] = Field(default=None)
    blur_analysis: BlurCheckResult
    deskew_analysis: DeskewResult
    mapped_bounding_boxes: List[BoundingBoxEntity]
    processing_time_ms: float
    success: bool = True

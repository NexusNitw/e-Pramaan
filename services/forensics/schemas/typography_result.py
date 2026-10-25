from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class FontAnomalyRegion(BaseModel):
    bbox: Dict[str, float] = Field(..., description="Coordinates: x, y, width, height")
    anomaly_type: str = Field(..., description="PASTED_FONT_SHARPNESS, STROKE_WIDTH_MISMATCH, or BASELINE_JAGGER")
    severity: str = Field(default="HIGH", description="CRITICAL, HIGH, or MEDIUM")
    confidence: float = Field(..., ge=0.0, le=1.0)
    flagged_text_snippet: Optional[str] = Field(default=None, description="Suspected modified figures or text snippet")


class TypographyAnalysisResult(BaseModel):
    mean_stroke_width: float = Field(..., description="Average character stroke width in pixels")
    stroke_variance: float = Field(..., description="Statistical variance in font stroke thickness")
    edge_sharpness_differential: float = Field(..., description="Gradient ratio between text boundaries and page noise")
    is_font_tampered: bool = Field(..., description="True if spliced typography or font inconsistency is identified")
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    flagged_regions: List[FontAnomalyRegion] = Field(default_factory=list)
    annotated_image_base64: Optional[str] = Field(default=None, description="PNG visualization with bounding boxes")


class FullForensicAuditResponse(BaseModel):
    filename: str
    composite_tampering_score: float = Field(..., ge=0.0, le=100.0, description="Overall forensic forgery index (0-100)")
    is_forgery_suspected: bool = Field(..., description="True if document exhibits significant digital modification")
    forgery_verdict: str = Field(..., description="VERIFIED_AUTHENTIC, SUSPICIOUS_ANOMALY, or HIGH_CONFIDENCE_FORGERY")
    ela_anomaly_score: float
    detected_editing_tools: List[str]
    typography_analysis: TypographyAnalysisResult
    flagged_tamper_regions: List[FontAnomalyRegion]
    annotated_evidence_base64: Optional[str] = Field(default=None)
    forensic_executive_summary: str
    processing_time_ms: float
    success: bool = True

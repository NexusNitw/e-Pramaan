from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class ELAResult(BaseModel):
    anomaly_score: float = Field(..., ge=0.0, le=100.0, description="Calculated ELA forgery probability score (0-100)")
    is_tampered: bool = Field(..., description="Flag indicating suspicious compression artifact deviation")
    mean_error: float = Field(..., description="Mean pixel difference value across RGB channels")
    max_error: float = Field(..., description="Maximum absolute pixel difference observed")
    standard_deviation: float = Field(..., description="Standard deviation of compression errors across the frame")
    high_contrast_pixel_ratio: float = Field(..., description="Ratio of outlier pixels showing abnormal compression rate")
    confidence_rating: str = Field(..., description="Severity classification: CLEAN, LOW_RISK, SUSPICIOUS, HIGH_FORGERY")
    heatmap_base64: Optional[str] = Field(default=None, description="Base64-encoded high-contrast ELA heatmap image")


class MetadataResult(BaseModel):
    file_type: str = Field(..., description="MIME or format type of the analyzed file")
    is_tampered_software: bool = Field(..., description="Flag if editing suite signatures (Photoshop, GIMP) are found")
    detected_editing_tools: List[str] = Field(default_factory=list, description="Names of editing software detected in metadata")
    has_exif: bool = Field(default=False, description="Whether EXIF metadata is present")
    exif_stripped: bool = Field(default=False, description="Flag indicating whether EXIF tags were stripped/sanitized")
    timestamp_discrepancy: bool = Field(default=False, description="Discrepancy between stated document date and file timestamps")
    creation_date: Optional[str] = Field(default=None, description="Document creation timestamp")
    modification_date: Optional[str] = Field(default=None, description="Document modification timestamp")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Normalized metadata key-values")


class ForensicAnalysisResponse(BaseModel):
    filename: str
    composite_tamper_flag: bool = Field(..., description="True if ELA or metadata flags indicate forgery")
    composite_forensic_score: float = Field(..., ge=0.0, le=100.0, description="Combined forensic tampering index (0-100)")
    ela_analysis: ELAResult
    metadata_analysis: MetadataResult
    forensic_summary: str = Field(..., description="Executive technical summary of findings")
    processing_time_ms: float
    success: bool = True

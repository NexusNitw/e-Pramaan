from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class PageClassificationResult(BaseModel):
    page_number: int
    detected_type: str = Field(..., description="Canonical document type detected for this page")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0")
    matched_keywords: List[str] = Field(default_factory=list, description="Specific regulatory keywords matched")
    text_length: int = Field(default=0, description="Total characters extracted on this page")
    text_snippet: Optional[str] = Field(default="", description="First 250 characters of extracted text")
    page_dimensions: Dict[str, float] = Field(
        default_factory=lambda: {"width": 0.0, "height": 0.0},
        description="Dimensions of page in points"
    )

class DocumentClassificationResponse(BaseModel):
    filename: str
    total_pages: int
    primary_document_type: str
    overall_confidence: float
    page_classifications: List[PageClassificationResult]
    category_breakdown: Dict[str, int] = Field(
        default_factory=dict,
        description="Count of pages identified under each document category"
    )
    processing_time_ms: float
    success: bool = True
    error_message: Optional[str] = None

class DocumentParseResponse(BaseModel):
    filename: str
    total_pages: int
    primary_document_type: str
    overall_confidence: float
    extracted_text_by_page: Dict[int, str]
    processing_time_ms: float
    success: bool = True

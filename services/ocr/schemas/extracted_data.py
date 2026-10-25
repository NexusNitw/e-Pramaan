from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class FacultyMemberExtracted(BaseModel):
    name: str = Field(..., description="Full name of teaching faculty member")
    designation: str = Field(..., description="Academic rank: Professor, Associate Professor, Assistant Professor")
    department: str = Field(..., description="Engineering or Academic Department")
    date_of_joining: Optional[str] = Field(default=None, description="ISO format date of joining (YYYY-MM-DD)")
    national_id_hash: Optional[str] = Field(default=None, description="SHA-256 hash of Aadhaar/PAN for deduplication")
    qualification: Optional[str] = Field(default=None, description="Degree credentials: Ph.D, M.Tech, B.Tech")
    confidence: float = Field(default=0.90, ge=0.0, le=1.0)


class TableParseResponse(BaseModel):
    filename: str
    total_rows_extracted: int
    columns_detected: List[str]
    faculty_roster: List[FacultyMemberExtracted]
    raw_tabular_rows: List[Dict[str, Any]]
    processing_time_ms: float
    success: bool = True


class CertificateAttributesExtracted(BaseModel):
    document_type: str = Field(..., description="Canonical AICTE certificate type")
    document_number: Optional[str] = Field(default=None, description="Official reference or certificate number")
    issuing_authority: Optional[str] = Field(default=None, description="Name of issuing government or university body")
    issue_date: Optional[str] = Field(default=None, description="Date of issuance (YYYY-MM-DD)")
    expiry_date: Optional[str] = Field(default=None, description="Expiration or validity cutoff date (YYYY-MM-DD)")
    sanctioned_intake: Optional[int] = Field(default=None, description="Approved student intake figure")
    builtUpAreaSqm: Optional[float] = Field(default=None, description="Operational built-up area in square meters")
    survey_numbers: List[str] = Field(default_factory=list, description="Extracted land revenue survey numbers")
    raw_key_values: Dict[str, Any] = Field(default_factory=dict, description="Discovered key-value pairs")


class CertificateExtractionResponse(BaseModel):
    filename: str
    document_type: str
    attributes: CertificateAttributesExtracted
    confidence: float = Field(default=0.88, ge=0.0, le=1.0)
    processing_time_ms: float
    success: bool = True

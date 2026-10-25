from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class PKISignatureResult(BaseModel):
    is_signed: bool = Field(..., description="Whether an embedded digital signature was discovered")
    is_valid: bool = Field(..., description="Cryptographic validity of the X.509 signature")
    signer_name: Optional[str] = Field(default=None, description="Common Name (CN) of signing official")
    issuer_cn: Optional[str] = Field(default=None, description="Certificate Authority (CA) issuer name")
    signing_time: Optional[str] = Field(default=None, description="Timestamp embedded in PKCS#7 envelope")
    cert_expiry: Optional[str] = Field(default=None, description="X.509 Certificate expiration date")
    signature_algorithm: Optional[str] = Field(default="sha256WithRSAEncryption", description="Hashing and cipher suite")
    integrity_status: str = Field(..., description="VALID_UNMODIFIED, SIGNATURE_CORRUPTED, or UNSIGNED")


class QRDecodedResult(BaseModel):
    qr_found: bool = Field(..., description="Whether a QR code was identified on the certificate")
    raw_payload: Optional[str] = Field(default=None, description="Raw text or decoded payload from QR")
    payload_type: str = Field(default="TEXT", description="URL, JSON, CRYPTO_HASH, or TEXT")
    matches_document: bool = Field(default=False, description="Whether QR payload matches OCR certificate text")
    parsed_attributes: Dict[str, Any] = Field(default_factory=dict, description="Parsed key-values from QR payload")


class ExternalRegistryResult(BaseModel):
    registry_name: str = Field(..., description="Name of external statutory registry (DigiLocker, State University)")
    query_id: str = Field(..., description="Document or registration identifier queried")
    status: str = Field(..., description="VERIFIED, EXPIRED, MISMATCH, NOT_FOUND, or SOURCE_DOWN")
    response_summary: str = Field(..., description="Human-readable result summary from statutory rail")
    details: Dict[str, Any] = Field(default_factory=dict, description="Normalized response payload from registry")


class ComprehensiveVerificationResponse(BaseModel):
    filename: str
    overall_trust_status: str = Field(..., description="TRUSTED, WARNING_DEFICIENCY, or SUSPECTED_FORGERY")
    trust_confidence: float = Field(..., ge=0.0, le=1.0)
    pki_signature: PKISignatureResult
    qr_verification: QRDecodedResult
    external_registries: List[ExternalRegistryResult]
    processing_time_ms: float
    success: bool = True

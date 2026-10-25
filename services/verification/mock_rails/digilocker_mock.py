import logging
from typing import Dict, Any
from ..schemas.verification_result import ExternalRegistryResult

logger = logging.getLogger("verification.digilocker_mock")


class DigiLockerMockRail:
    """
    Simulated DigiLocker Statutory Repository API.
    Replicates DigiLocker National Academic Depository (NAD) and state document issuance rails.
    """

    def query_document(self, query_id: str, document_type: str = "FIRE_SAFETY_NOC", filename: str = "") -> ExternalRegistryResult:
        """
        Queries simulated DigiLocker vault and returns state verification payload.
        """
        lower_name = (filename + " " + query_id).lower()

        if "expired" in lower_name:
            return ExternalRegistryResult(
                registry_name="DigiLocker National Vault (Fire Services)",
                query_id=query_id,
                status="EXPIRED",
                response_summary="Document found in DigiLocker repository, but validity expired 3 months ago.",
                details={
                  "certificateNumber": query_id,
                  "vaultHash": "sha256-8f2c019a3b9841",
                  "issuanceDate": "2024-03-10",
                  "expiryDate": "2025-03-09",
                  "isRevoked": False,
                  "issuingAuthority": "State Fire and Emergency Services",
                },
            )
        elif "tampered" in lower_name:
            return ExternalRegistryResult(
                registry_name="DigiLocker National Vault (University Affiliation)",
                query_id=query_id,
                status="MISMATCH",
                response_summary="DigiLocker master record differs from uploaded document (Master sanctioned intake is 180, not 300).",
                details={
                  "certificateNumber": query_id,
                  "vaultIntake": 180,
                  "vaultHash": "sha256-42d81829a00941",
                  "tamperFlag": "MODIFIED_PAYLOAD_DETECTED",
                  "issuingAuthority": "State Technological University",
                },
            )
        else:
            return ExternalRegistryResult(
                registry_name="DigiLocker National Vault",
                query_id=query_id,
                status="VERIFIED",
                response_summary="100% Match: Digital record matches verified repository hash in DigiLocker registry.",
                details={
                  "certificateNumber": query_id,
                  "vaultHash": "sha256-77e8192a0149bb",
                  "issuanceDate": "2026-01-15",
                  "expiryDate": "2027-01-14",
                  "isRevoked": False,
                  "issuingAuthority": "Competent Statutory Authority",
                },
            )

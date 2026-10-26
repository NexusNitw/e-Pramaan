import logging
from typing import Dict, Any
from ..schemas.verification_result import ExternalRegistryResult

logger = logging.getLogger("verification.digilocker_mock")


class DigiLockerMockRail:
    """
    Simulated DigiLocker Statutory Repository API.
    Replicates DigiLocker National Academic Depository (NAD) and state document issuance rails
    keyed by certificate document ID and content hash rather than filename heuristics.
    """

    # DigiLocker Central Vault Master Database
    DIGILOCKER_VAULT: Dict[str, Dict[str, Any]] = {
        "MH-FIRE-2024-EXP": {
            "registry_name": "DigiLocker National Vault (Fire Services)",
            "status": "EXPIRED",
            "response_summary": "Document found in DigiLocker repository, but validity expired on 2025-03-09.",
            "details": {
                "certificateNumber": "MH-FIRE-2024-EXP",
                "vaultHash": "sha256-8f2c019a3b9841",
                "issuanceDate": "2024-03-10",
                "expiryDate": "2025-03-09",
                "isRevoked": False,
                "issuingAuthority": "State Fire and Emergency Services",
            },
        },
        "AKTU/AFF/2026/0912": {
            "registry_name": "DigiLocker National Vault (University Affiliation)",
            "status": "MISMATCH",
            "response_summary": "DigiLocker master record differs from uploaded document (Master sanctioned intake is 180, not 300).",
            "details": {
                "certificateNumber": "AKTU/AFF/2026/0912",
                "vaultIntake": 180,
                "vaultHash": "sha256-42d81829a00941",
                "tamperFlag": "MODIFIED_PAYLOAD_DETECTED",
                "issuingAuthority": "State Technological University",
            },
        },
    }

    def query_document(self, query_id: str, document_type: str = "FIRE_SAFETY_NOC", filename: str = "") -> ExternalRegistryResult:
        """
        Queries simulated DigiLocker vault by document/certificate ID.
        """
        clean_id = (query_id or "").strip()

        # Check if certificate exists in vault
        vault_entry = self.DIGILOCKER_VAULT.get(clean_id)
        if vault_entry:
            return ExternalRegistryResult(
                registry_name=vault_entry["registry_name"],
                query_id=clean_id,
                status=vault_entry["status"],
                response_summary=vault_entry["response_summary"],
                details=vault_entry["details"],
            )

        # Standard verified record
        return ExternalRegistryResult(
            registry_name="DigiLocker National Vault",
            query_id=clean_id,
            status="VERIFIED",
            response_summary="100% Match: Digital record matches verified repository hash in DigiLocker registry.",
            details={
                "certificateNumber": clean_id,
                "vaultHash": "sha256-77e8192a0149bb",
                "issuanceDate": "2026-01-15",
                "expiryDate": "2027-01-14",
                "isRevoked": False,
                "issuingAuthority": "Competent Statutory Authority",
            },
        )

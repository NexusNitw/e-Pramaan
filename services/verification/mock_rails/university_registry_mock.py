import logging
from typing import Dict, Any
from ..schemas.verification_result import ExternalRegistryResult

logger = logging.getLogger("verification.univ_mock")


class UniversityRegistryMockRail:
    """
    Simulated State Technological University Affiliation Registry.
    Cross-checks college affiliation status and sanctioned course capacities.
    """

    def query_affiliation(self, aicte_id: str, requested_intake: int = 420, filename: str = "") -> ExternalRegistryResult:
        """
        Cross-checks institution against university affiliation master records.
        """
        lower_name = (filename + " " + aicte_id).lower()

        if "tampered" in lower_name:
            return ExternalRegistryResult(
                registry_name="State Technological University Master Database",
                query_id=aicte_id,
                status="MISMATCH",
                response_summary=f"Affiliation quota mismatch: University approved ceiling is 180 seats, but dossier requested {requested_intake} seats.",
                details={
                    "approvedCeiling": 180,
                    "requestedIntake": requested_intake,
                    "academicYear": "2026-2027",
                    "affiliationType": "PROVISIONAL",
                    "syndicateResolutionNo": "STU/RES/2026/088",
                },
            )
        else:
            return ExternalRegistryResult(
                registry_name="State Technological University Master Database",
                query_id=aicte_id,
                status="VERIFIED",
                response_summary="Active institutional affiliation confirmed for Academic Year 2026-2027.",
                details={
                    "approvedCeiling": requested_intake,
                    "requestedIntake": requested_intake,
                    "academicYear": "2026-2027",
                    "affiliationType": "PERMANENT",
                    "syndicateResolutionNo": "STU/RES/2026/104",
                },
            )

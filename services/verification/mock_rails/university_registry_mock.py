import logging
from typing import Dict, Any
from ..schemas.verification_result import ExternalRegistryResult

logger = logging.getLogger("verification.univ_mock")


class UniversityRegistryMockRail:
    """
    Simulated State Technological University Affiliation Registry.
    Cross-checks college affiliation status and sanctioned course capacities
    against official university master records by AICTE ID without filename hacks.
    """

    # Master registry of sanctioned institutional quotas by AICTE ID
    UNIVERSITY_SANCTION_REGISTRY: Dict[str, int] = {
        "1-9923847162": 180,  # Skyline Institute: Approved ceiling is 180 seats (application requested 300)
        "1-4928172911": 420,  # National Institute: Approved ceiling is 420 seats
        "1-7729103940": 180,  # Apex Global College of Pharmacy: Approved ceiling is 180 seats
        "1-6638102947": 240,  # St. Xavier Institute of Engineering: Approved ceiling is 240 seats
        "1-8847291038": 120,  # Modern College of Architecture: Approved ceiling is 120 seats
        "1-3349182390": 360,  # Apex Institute of Technology: Approved ceiling is 360 seats
    }

    def query_affiliation(self, aicte_id: str, requested_intake: int = 420, filename: str = "") -> ExternalRegistryResult:
        """
        Cross-checks institution against university affiliation master records.
        """
        clean_id = (aicte_id or "").strip()
        approved_ceiling = self.UNIVERSITY_SANCTION_REGISTRY.get(clean_id)

        # If institution is registered in university database and requested intake exceeds university sanction
        if approved_ceiling is not None and requested_intake > approved_ceiling:
            return ExternalRegistryResult(
                registry_name="State Technological University Master Database",
                query_id=clean_id,
                status="MISMATCH",
                response_summary=f"Affiliation quota mismatch: University approved ceiling is {approved_ceiling} seats, but dossier requested {requested_intake} seats.",
                details={
                    "approvedCeiling": approved_ceiling,
                    "requestedIntake": requested_intake,
                    "academicYear": "2026-2027",
                    "affiliationType": "PROVISIONAL",
                    "syndicateResolutionNo": "STU/RES/2026/088",
                },
            )
        else:
            ceiling = approved_ceiling if approved_ceiling is not None else requested_intake
            return ExternalRegistryResult(
                registry_name="State Technological University Master Database",
                query_id=clean_id,
                status="VERIFIED",
                response_summary="Active institutional affiliation confirmed for Academic Year 2026-2027.",
                details={
                    "approvedCeiling": ceiling,
                    "requestedIntake": requested_intake,
                    "academicYear": "2026-2027",
                    "affiliationType": "PERMANENT",
                    "syndicateResolutionNo": "STU/RES/2026/104",
                },
            )

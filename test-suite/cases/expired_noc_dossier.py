"""
Test Case 2: Incomplete / Expired Fire Safety NOC Dossier
Characteristics:
- Fire Safety NOC: Expired on 09/03/2025 (overdue by >3 months)
- Academic Norms: Passes SFR and affiliation intake
- Expected Triage: YELLOW_DEFICIENCY (Deficiency Notice Triggered, Risk 35 - 55)
"""

EXPIRED_NOC_DOSSIER_DATA = {
    "case_id": "TC-02-EXPIRED-NOC",
    "expected_triage": "YELLOW_DEFICIENCY",
    "min_expected_risk": 30.0,
    "max_allowed_risk": 60.0,
    "institution": {
        "aictePermanentId": "1-7729103940",
        "name": "Apex Global College of Pharmacy & Research",
        "category": "PHARMACY",
        "state": "Karnataka",
        "district": "Bengaluru",
        "geoCoordinates": {"latitude": 12.9716, "longitude": 77.5946},
        "landDetails": {"totalAreaSqm": 9500},
    },
    "application": {
        "applicationNumber": "AICTE-2026-EOA-2041",
        "academicYear": "2026-2027",
        "category": "EXTENSION_OF_APPROVAL",
        "requestedIntake": 180,
        "totalStudentEnrolled": 640,
    },
    "documents": [
        {
            "type": "FIRE_SAFETY_NOC",
            "filename": "Fire_Safety_NOC_2024_Expired.pdf",
            "content_text": (
                "KARNATAKA FIRE AND EMERGENCY SERVICES\n"
                "NO OBJECTION CERTIFICATE (RENEWAL)\n"
                "Ref No: K-FIRE-2023-881\n"
                "NOC issued for Apex Global College of Pharmacy. "
                "Built-up area: 9,500 sq.m. "
                "Valid up to: 09/03/2025. Dated: 10/03/2024.\n"
                "Digitally signed by Commandant, Fire Force."
            ),
        },
    ],
}

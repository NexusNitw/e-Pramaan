"""
Test Case 3: Digital Tampering Dossier (Photoshop-edited Seat Intake)
Characteristics:
- Photoshop-edited seat intake numbers on affiliation certificate (modified from 180 to 300)
- Inconsistent compression artifacts (ELA anomaly score 84.2/100)
- Mismatched typography anti-aliasing and stroke variance
- EXIF footprint: Adobe Photoshop CC 2023
- Expected Triage: RED_HIGH_RISK_FORGERY (Risk Score > 80)
"""

TAMPERED_INTAKE_DOSSIER_DATA = {
    "case_id": "TC-03-TAMPERED-INTAKE",
    "expected_triage": "RED_HIGH_RISK_FORGERY",
    "min_expected_risk": 75.0,
    "institution": {
        "aictePermanentId": "1-9923847162",
        "name": "Skyline Institute of Technology & Management",
        "category": "ENGINEERING_TECH",
        "state": "Uttar Pradesh",
        "district": "Noida",
        "geoCoordinates": {"latitude": 28.5355, "longitude": 77.3910},
        "landDetails": {"totalAreaSqm": 12000},
    },
    "application": {
        "applicationNumber": "AICTE-2026-INT-4091",
        "academicYear": "2026-2027",
        "category": "INCREASE_IN_INTAKE",
        "requestedIntake": 300,  # Inflated from University approved 180
        "totalStudentEnrolled": 1100,
    },
    "documents": [
        {
            "type": "UNIVERSITY_AFFILIATION_LETTER",
            "filename": "AKTU_Affiliation_Intake_Tampered.pdf",
            "content_text": (
                "DR. A.P.J. ABDUL KALAM TECHNICAL UNIVERSITY, LUCKNOW\n"
                "AFFILIATION SANCTION ORDER 2026\n"
                "Ref No: AKTU/AFF/2026/0912\n"
                "The University hereby approves Sanctioned Intake: 300 Seats in B.Tech Engineering.\n"
                "Photoshop software trace in Producer tag.\n"
                "Valid for Academic Cycle 2026-2027."
            ),
        },
    ],
}

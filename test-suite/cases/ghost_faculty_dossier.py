"""
Test Case 5: Ghost Faculty Collision Dossier
Characteristics:
- Faculty roster contains professors whose national ID hashes match active employment records at another college
- Direct violation of AICTE Approval Process Handbook (APH) central faculty deduplication rule
- Expected Triage: RED_HIGH_RISK_FORGERY / High Deficiency (Risk Score > 60)
"""

GHOST_FACULTY_DOSSIER_DATA = {
    "case_id": "TC-05-GHOST-FACULTY",
    "expected_triage": "RED_HIGH_RISK_FORGERY",
    "min_expected_risk": 60.0,
    "institution": {
        "aictePermanentId": "1-6638102947",
        "name": "St. Xavier Institute of Engineering",
        "category": "ENGINEERING_TECH",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "geoCoordinates": {"latitude": 13.0827, "longitude": 80.2707},
        "landDetails": {"totalAreaSqm": 15000},
    },
    "application": {
        "applicationNumber": "AICTE-2026-EOA-7703",
        "academicYear": "2026-2027",
        "category": "EXTENSION_OF_APPROVAL",
        "requestedIntake": 240,
        "totalStudentEnrolled": 890,
    },
    "documents": [
        {
            "type": "FACULTY_MASTER_ROSTER",
            "filename": "Faculty_Roster_Ghost_Collision.pdf",
            "content_text": (
                "FACULTY MASTER ROSTER 2026-2027\n"
                "Dr. K. Ramanathan | Professor & HOD | Computer Science | 2016-08-01 | Ph.D\n"
                "(National ID Hash: 8841a9bc384f9 - Concurrently active at Sri Krishna College of Tech)\n"
                "Dr. Meenakshi Sundaram | Associate Professor | Electronics | 2019-07-15 | Ph.D\n"
                "(National ID Hash: a91823bb018f2 - Concurrently active at PSG Tech, Coimbatore)"
            ),
        },
    ],
}

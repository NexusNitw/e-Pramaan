"""
Test Case 1: Clean Dossier (100% Compliant)
Characteristics:
- Student-Faculty Ratio: 1:14.2 (meets <= 1:15 threshold)
- Fire Safety NOC: Active until 2027, authentic X.509 signature
- University Affiliation: Sanctioned intake matches requested 420 seats exactly
- Infrastructure: Built-up area exceeds 8.5 sq.m/student
- Expected Triage: GREEN_COMPLIANT (Risk Score < 10)
"""

CLEAN_DOSSIER_DATA = {
    "case_id": "TC-01-CLEAN",
    "expected_triage": "GREEN_COMPLIANT",
    "max_allowed_risk": 15.0,
    "institution": {
        "aictePermanentId": "1-4928172911",
        "name": "National Institute of Advanced Engineering & Technology",
        "category": "ENGINEERING_TECH",
        "state": "Maharashtra",
        "district": "Pune",
        "geoCoordinates": {"latitude": 18.5204, "longitude": 73.8567},
        "landDetails": {"totalAreaSqm": 18500},
    },
    "application": {
        "applicationNumber": "AICTE-2026-EOA-1082",
        "academicYear": "2026-2027",
        "category": "EXTENSION_OF_APPROVAL",
        "requestedIntake": 420,
        "totalStudentEnrolled": 1580,
    },
    "documents": [
        {
            "type": "FIRE_SAFETY_NOC",
            "filename": "Fire_NOC_Renewal_2026.pdf",
            "content_text": (
                "OFFICE OF CHIEF FIRE OFFICER, PUNE DIVISION\n"
                "NO OBJECTION CERTIFICATE\n"
                "Ref No: MH-FIRE-2026-0921\n"
                "This is to certify that National Institute of Advanced Engineering & Technology "
                "complies with all fire prevention measures under National Building Code Part IV. "
                "Total built-up area: 18,500 sq.m. "
                "Valid up to: 14/01/2027. Issued on: 15/01/2026.\n"
                "Digitally signed by Chief Fire Officer."
            ),
        },
        {
            "type": "UNIVERSITY_AFFILIATION_LETTER",
            "filename": "Savitribai_Phule_Affiliation_2026.pdf",
            "content_text": (
                "SAVITRIBAI PHULE PUNE UNIVERSITY\n"
                "NOTIFICATION OF PROVISIONAL AFFILIATION\n"
                "Order No: SPPU/AFFIL/2026/882\n"
                "Approval granted for Undergraduate Engineering programs with sanctioned intake of 420 seats "
                "for Academic Year 2026-2027.\n"
                "Digitally signed by Registrar, SPPU."
            ),
        },
        {
            "type": "FACULTY_MASTER_ROSTER",
            "filename": "Faculty_Roster_2026.pdf",
            "content_text": (
                "Dr. Rameshwar Rao | Professor & HOD | Computer Science | 2014-06-10 | Ph.D\n"
                "Dr. Neha Kulkarni | Associate Professor | Computer Science | 2017-08-15 | Ph.D\n"
                "Prof. Amit Deshmukh | Assistant Professor | Computer Science | 2020-07-01 | M.Tech\n"
                "Pooja Gaikwad | Assistant Professor | Computer Science | 2022-01-15 | M.Tech"
            ),
        },
    ],
}

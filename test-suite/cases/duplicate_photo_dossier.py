"""
Test Case 4: Infrastructure Duplication & Off-Campus Geotag Dossier
Characteristics:
- Identical physics lab photograph submitted for both chemistry and mechanical workshop requirements
- pHash matches historical record from another institution (Hamming distance = 0)
- EXIF GPS coordinates placed 62.4 km off-campus, violating the 800m geofence perimeter
- Expected Triage: RED_HIGH_RISK_FORGERY (Risk Score > 75)
"""

DUPLICATE_PHOTO_DOSSIER_DATA = {
    "case_id": "TC-04-DUPLICATE-PHOTO",
    "expected_triage": "RED_HIGH_RISK_FORGERY",
    "min_expected_risk": 75.0,
    "institution": {
        "aictePermanentId": "1-8847291038",
        "name": "Modern College of Architecture & Design",
        "category": "ARCHITECTURE",
        "state": "Telangana",
        "district": "Hyderabad",
        "geoCoordinates": {"latitude": 17.3850, "longitude": 78.4867},
        "landDetails": {"totalAreaSqm": 11000},
    },
    "application": {
        "applicationNumber": "AICTE-2026-EOA-5512",
        "academicYear": "2026-2027",
        "category": "EXTENSION_OF_APPROVAL",
        "requestedIntake": 120,
        "totalStudentEnrolled": 410,
    },
    "documents": [
        {
            "type": "INFRASTRUCTURE_PHOTO",
            "filename": "CAD_Studio_Lab_Photo_Duplicate.jpg",
            "content_text": (
                "INFRASTRUCTURE FACILITY PHOTOGRAPH - ROOM 102\n"
                "Claimed: Architectural CAD Design Studio\n"
                "pHash fingerprint: bf82d921a8f01c34\n"
                "GPS Geotag: Lat 16.9820, Lon 78.1120 (Distance: 62.4 km off-campus)"
            ),
        },
    ],
}

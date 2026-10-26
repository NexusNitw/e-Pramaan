import os
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

OUTPUT_BASE = Path("sample_test_documents")

def draw_official_border_and_banner(c, width, height, dept_title, doc_title, banner_color=(0.12, 0.23, 0.45)):
    # Outer double border
    c.setStrokeColorRGB(0.12, 0.23, 0.45)
    c.setLineWidth(2)
    c.rect(30, 30, width - 60, height - 60)
    c.setStrokeColorRGB(0.7, 0.75, 0.85)
    c.setLineWidth(0.8)
    c.rect(34, 34, width - 68, height - 68)

    # Top Banner Accent
    c.setFillColorRGB(*banner_color)
    c.rect(34, height - 75, width - 68, 41, fill=1, stroke=0)

    # Government Header
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2.0, height - 52, "GOVERNMENT OF INDIA • STATUTORY REGULATORY BODY")
    c.setFont("Helvetica-Bold", 9.5)
    c.drawCentredString(width / 2.0, height - 68, dept_title.upper())

    # Document Subtitle
    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawCentredString(width / 2.0, height - 95, doc_title)

    c.setStrokeColorRGB(0.8, 0.85, 0.9)
    c.setLineWidth(1)
    c.line(45, height - 105, width - 45, height - 105)

def draw_footer_and_pki(c, width, height, token_id, is_valid=True):
    c.setStrokeColorRGB(0.8, 0.85, 0.9)
    c.setLineWidth(1)
    c.line(45, 95, width - 45, 95)

    # QR Code placeholder
    c.setStrokeColorRGB(0.2, 0.3, 0.5)
    c.setLineWidth(1)
    c.rect(width - 95, 42, 50, 50)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawCentredString(width - 70, 70, "AICTE / PKI")
    c.setFillColorRGB(0.05, 0.5, 0.2) if is_valid else c.setFillColorRGB(0.8, 0.1, 0.1)
    c.drawCentredString(width - 70, 60, "VERIFIED" if is_valid else "TAMPERED")
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawCentredString(width - 70, 48, "[QR CODE]")

    # Signoff details
    c.setFillColorRGB(0.2, 0.25, 0.35)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(45, 82, "Digitally Signed and Authenticated under Indian Information Technology Act, 2000.")
    c.setFont("Helvetica", 7)
    c.drawString(45, 71, f"Digital Token ID: {token_id} | Security Algorithm: RSA-SHA256 | PKI Status: {'Valid' if is_valid else 'Failed / Discrepancy'}")
    c.drawString(45, 60, "Official Regulatory Instrument • Central Repository of AICTE Regulatory Filings")
    c.drawString(45, 49, "e-Pramaan National Compliance Infrastructure • Ministry of Education, Govt. of India")

# ==========================================
# 1. COMPLIANT SUITE GENERATORS
# ==========================================

def generate_compliant_fire_noc(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    draw_official_border_and_banner(
        c, width, height,
        "Directorate of Fire Prevention & Emergency Services",
        "STATUTORY NO OBJECTION CERTIFICATE (FIRE & LIFE SAFETY CLEARANCE)"
    )

    # Metadata Box
    c.setFillColorRGB(0.96, 0.97, 0.99)
    c.rect(45, height - 165, width - 90, 52, fill=1, stroke=0)
    c.setStrokeColorRGB(0.85, 0.88, 0.93)
    c.setLineWidth(0.8)
    c.rect(45, height - 165, width - 90, 52, fill=0, stroke=1)

    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(55, height - 123, "Certificate Ref No: MH-FIRE-2026-0921")
    c.drawString(320, height - 123, "Date of Issue: 15/01/2026")
    c.drawString(55, height - 138, "AICTE Permanent ID: 1-3349182390")
    c.drawString(320, height - 138, "Validity Period: 15/01/2026 to 14/01/2027")
    c.drawString(55, height - 153, "Institution: Apex Institute of Technology & Sciences, Pune, Maharashtra")

    # Statutory Narrative
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 185, "1. STATUTORY INSPECTION & NATIONAL BUILDING CODE COMPLIANCE")
    c.setFont("Helvetica", 8)
    c.drawString(45, height - 200, "This is to certify that physical inspection of the educational premises was conducted by the Divisional Fire Officer.")
    c.drawString(45, height - 212, "The institutional campus fulfills all fire prevention, life safety, and hazard containment provisions prescribed under")
    c.drawString(45, height - 224, "National Building Code of India (Part IV) and State Fire Prevention and Life Safety Measures Rules.")
    c.drawString(45, height - 236, "Total verified built-up area: 18,500 sq.m across Academic Blocks A, B, and Central Computing Facility.")

    # Table of Installations
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 256, "2. SCHEDULE OF VERIFIED ACTIVE & PASSIVE FIRE SAFETY INSTALLATIONS")

    c.setFillColorRGB(0.2, 0.28, 0.45)
    c.rect(45, height - 276, width - 90, 16, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(55, height - 268, "Safety System Description")
    c.drawString(240, height - 268, "Capacity / Specifications")
    c.drawString(370, height - 268, "Testing Standard")
    c.drawString(465, height - 268, "Status")

    systems = [
        ("Underground Static Water Storage Tank", "200,000 Litres RCC Tank", "IS 15301 / NBC IV", "OPERATIONAL"),
        ("Overhead Terrace Fire Water Tank", "25,000 Litres Tank on Block A", "IS 15105 / NBC IV", "OPERATIONAL"),
        ("Main Fire Pump (Electrical & Diesel)", "2,850 LPM @ 7.0 Bar Head", "IS 12469 / Class A", "VERIFIED"),
        ("External Wet Riser & Yard Hydrant System", "18 Hydrant Landing Valves", "IS 3844 / Class I", "TESTED OK"),
        ("Addressable Optical Smoke Detection", "480 Detectors + Dual Loop Panel", "IS 2189 / NFPA 72", "FUNCTIONAL"),
        ("Portable CO2 & ABC Dry Powder Extinguishers", "85 Cylinders (4kg & 6kg)", "IS 15683 Compliance", "SERVICED"),
    ]

    y_pos = height - 292
    for sys_name, cap, std, st in systems:
        c.setFillColorRGB(0.97, 0.98, 1.0)
        c.rect(45, y_pos - 4, width - 90, 15, fill=1, stroke=0)
        c.setStrokeColorRGB(0.9, 0.92, 0.95)
        c.setLineWidth(0.5)
        c.rect(45, y_pos - 4, width - 90, 15, fill=0, stroke=1)

        c.setFillColorRGB(0.15, 0.2, 0.3)
        c.setFont("Helvetica", 7.5)
        c.drawString(52, y_pos + 1, sys_name)
        c.drawString(240, y_pos + 1, cap)
        c.drawString(370, y_pos + 1, std)
        c.setFillColorRGB(0.05, 0.45, 0.2)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(465, y_pos + 1, st)
        y_pos -= 16

    # Conditions & Validity
    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, y_pos - 12, "3. MANDATORY CONDITIONS & STATUTORY VALIDITY")
    c.setFont("Helvetica", 8)
    c.drawString(45, y_pos - 25, "• This No Objection Certificate is valid up to: 14/01/2027 subject to annual renewal and mock drills.")
    c.drawString(45, y_pos - 37, "• Emergency exit corridors, staircases, and fire exits must remain unblocked at all times.")
    c.drawString(45, y_pos - 49, "• Institutional management shall maintain a trained emergency response squad on campus.")

    # Signature
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(380, y_pos - 80, "CHIEF FIRE OFFICER")
    c.setFont("Helvetica", 7.5)
    c.drawString(380, y_pos - 90, "Divisional Fire Authority, Pune")
    c.drawString(380, y_pos - 100, "State Fire & Rescue Services Department")
    c.setStrokeColorRGB(0.2, 0.3, 0.5)
    c.rect(375, y_pos - 110, 130, 36)

    draw_footer_and_pki(c, width, height, "NOC-2026-MH-0921-VALID", is_valid=True)
    c.save()


def generate_compliant_affiliation(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    draw_official_border_and_banner(
        c, width, height,
        "Office of the Registrar • Affiliation Section",
        "NOTIFICATION OF PROVISIONAL AFFILIATION (ACADEMIC YEAR 2026-2027)"
    )

    # Metadata Box
    c.setFillColorRGB(0.96, 0.97, 0.99)
    c.rect(45, height - 165, width - 90, 52, fill=1, stroke=0)
    c.setStrokeColorRGB(0.85, 0.88, 0.93)
    c.setLineWidth(0.8)
    c.rect(45, height - 165, width - 90, 52, fill=0, stroke=1)

    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(55, height - 123, "Affiliation Order No: SPPU/AFFIL/2026/882")
    c.drawString(320, height - 123, "Date of Issue: 22/01/2026")
    c.drawString(55, height - 138, "AICTE Permanent ID: 1-3349182390")
    c.drawString(320, height - 138, "Academic Session: 2026-2027")
    c.drawString(55, height - 153, "Institution: Apex Institute of Technology & Sciences, Pune, Maharashtra")

    # Body Narrative
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 185, "1. STATUTORY GRANT OF PROVISIONAL AFFILIATION")
    c.setFont("Helvetica", 8)
    c.drawString(45, height - 200, "In pursuance of the resolution passed by the Academic Council and under Section 108 of the State Universities Act,")
    c.drawString(45, height - 212, "Savitribai Phule Pune University hereby extends provisional affiliation to Apex Institute of Technology & Sciences")
    c.drawString(45, height - 224, "for conducting the undermentioned 4-Year Undergraduate Engineering Degree Programmes with sanctioned intake")
    c.drawString(45, height - 236, "capacity of 360 seats for the Academic Year 2026-2027.")

    # Program Breakdown Table
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 256, "2. APPROVED UNDERGRADUATE PROGRAMMES & SANCTIONED SEAT INTAKE")

    c.setFillColorRGB(0.2, 0.28, 0.45)
    c.rect(45, height - 276, width - 90, 16, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(55, height - 268, "Approved Technical Degree Course")
    c.drawString(250, height - 268, "Level")
    c.drawString(340, height - 268, "Affiliation Type")
    c.drawString(440, height - 268, "Sanctioned Intake")

    progs = [
        ("Computer Engineering & Data Science", "UG (4 Years)", "Provisional Affiliation", "180 Seats"),
        ("Electronics & Communication Engineering", "UG (4 Years)", "Provisional Affiliation", "120 Seats"),
        ("Information Technology & Computing", "UG (4 Years)", "Provisional Affiliation", "60 Seats"),
    ]

    y_pos = height - 292
    for p_name, lvl, aff, intake in progs:
        c.setFillColorRGB(0.97, 0.98, 1.0)
        c.rect(45, y_pos - 4, width - 90, 15, fill=1, stroke=0)
        c.setStrokeColorRGB(0.9, 0.92, 0.95)
        c.setLineWidth(0.5)
        c.rect(45, y_pos - 4, width - 90, 15, fill=0, stroke=1)

        c.setFillColorRGB(0.15, 0.2, 0.3)
        c.setFont("Helvetica", 7.5)
        c.drawString(52, y_pos + 1, p_name)
        c.drawString(250, y_pos + 1, lvl)
        c.drawString(340, y_pos + 1, aff)
        c.setFillColorRGB(0.1, 0.2, 0.5)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(440, y_pos + 1, intake)
        y_pos -= 16

    # Total row
    c.setFillColorRGB(0.92, 0.95, 0.98)
    c.rect(45, y_pos - 4, width - 90, 16, fill=1, stroke=0)
    c.setFillColorRGB(0.1, 0.2, 0.4)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(52, y_pos + 1, "TOTAL SANCTIONED INTAKE CAPACITY (ACADEMIC YEAR 2026-2027)")
    c.drawString(440, y_pos + 1, "360 SEATS")
    y_pos -= 25

    # Regulatory Notes
    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, y_pos, "3. CONDITIONS OF AFFILIATION & REGULATORY COMPLIANCE")
    c.setFont("Helvetica", 8)
    c.drawString(45, y_pos - 14, "• Student-to-Faculty Ratio: The college shall maintain a strict ratio of 1:15 as mandated by AICTE.")
    c.drawString(45, y_pos - 26, "• Sanctioned Ceiling: Admissions beyond the sanctioned intake of 360 seats shall be void ab initio.")
    c.drawString(45, y_pos - 38, "• Faculty Cadre: Cadre ratio of 1 Professor : 2 Associate Professors : 6 Assistant Professors must be maintained.")

    # Signature
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(380, y_pos - 75, "REGISTRAR")
    c.setFont("Helvetica", 7.5)
    c.drawString(380, y_pos - 85, "Savitribai Phule Pune University")
    c.drawString(380, y_pos - 95, "Affiliation & Academic Regulatory Board")
    c.setStrokeColorRGB(0.2, 0.3, 0.5)
    c.rect(375, y_pos - 105, 130, 36)

    draw_footer_and_pki(c, width, height, "SPPU-AFFIL-2026-882-GENUINE", is_valid=True)
    c.save()


def generate_compliant_faculty_roster(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    draw_official_border_and_banner(
        c, width, height,
        "AICTE Statutory Faculty Regulatory & Compliance Cell",
        "FACULTY MASTER ROSTER & CADRE RATIO VERIFICATION ATTESTATION"
    )

    # Metadata Box
    c.setFillColorRGB(0.96, 0.97, 0.99)
    c.rect(45, height - 160, width - 90, 48, fill=1, stroke=0)
    c.setStrokeColorRGB(0.85, 0.88, 0.93)
    c.setLineWidth(0.8)
    c.rect(45, height - 160, width - 90, 48, fill=0, stroke=1)

    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(55, height - 123, "AICTE Permanent ID: 1-3349182390")
    c.drawString(320, height - 123, "Academic Session: 2026-2027")
    c.drawString(55, height - 138, "Institution: Apex Institute of Technology & Sciences, Pune")
    c.drawString(320, height - 138, "Total Approved Faculty Count: 24 Full-Time")
    c.drawString(55, height - 152, "Total Batch Intake: 360 Seats | Student-to-Faculty Ratio (SFR): 1:15.0 (COMPLIANT)")

    # Faculty Table
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 176, "1. FULL-TIME TEACHING FACULTY CADRE ROSTER")

    c.setFillColorRGB(0.2, 0.28, 0.45)
    c.rect(45, height - 196, width - 90, 16, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(48, height - 188, "S.No")
    c.drawString(75, height - 188, "Faculty Name")
    c.drawString(175, height - 188, "Designation")
    c.drawString(275, height - 188, "Department")
    c.drawString(365, height - 188, "Joining Date")
    c.drawString(425, height - 188, "Qualification")
    c.drawString(485, height - 188, "Status")

    # 24 full-time faculty members (3 Professors/HODs, 6 Assoc Profs, 15 Asst Profs)
    faculty_dataset = [
        ("1", "Dr. Rameshwar Rao", "Professor & HOD", "Computer Science", "2014-06-10", "Ph.D (IIT Bombay)", "Approved"),
        ("2", "Dr. Neha Kulkarni", "Associate Professor", "Computer Science", "2017-08-15", "Ph.D (IISc Bangalore)", "Approved"),
        ("3", "Prof. Amit Deshmukh", "Assistant Professor", "Computer Science", "2020-07-01", "M.Tech (NIT Nagpur)", "Approved"),
        ("4", "Prof. Pooja Gaikwad", "Assistant Professor", "Computer Science", "2022-01-15", "M.Tech (COEP Pune)", "Approved"),
        ("5", "Prof. Vikas Sharma", "Assistant Professor", "Computer Science", "2021-09-10", "M.Tech (VJTI)", "Approved"),
        ("6", "Prof. Sneha Patil", "Assistant Professor", "Computer Science", "2023-02-01", "M.Tech (Pune Univ)", "Approved"),
        ("7", "Dr. Sunita Varma", "Professor & HOD", "Electronics & Comm", "2015-09-01", "Ph.D (SPPU Pune)", "Approved"),
        ("8", "Dr. Rajeshwar Patil", "Associate Professor", "Electronics & Comm", "2018-02-12", "Ph.D (VNIT Nagpur)", "Approved"),
        ("9", "Prof. Vikram Shinde", "Assistant Professor", "Electronics & Comm", "2021-08-10", "M.Tech (COEP)", "Approved"),
        ("10", "Prof. Kavita Joshi", "Assistant Professor", "Electronics & Comm", "2023-04-01", "M.Tech (SPPU)", "Approved"),
        ("11", "Prof. Anand More", "Assistant Professor", "Electronics & Comm", "2022-06-15", "M.Tech (NIT Surathkal)", "Approved"),
        ("12", "Prof. Deepak Nair", "Assistant Professor", "Electronics & Comm", "2020-11-20", "M.Tech (IIT Madras)", "Approved"),
        ("13", "Dr. Arvind Kulkarni", "Professor & HOD", "Information Tech", "2013-11-20", "Ph.D (IIT Delhi)", "Approved"),
        ("14", "Dr. Meenakshi Iyer", "Associate Professor", "Information Tech", "2019-06-18", "Ph.D (BITS Pilani)", "Approved"),
        ("15", "Prof. Rahul Kadam", "Assistant Professor", "Information Tech", "2022-07-15", "M.Tech (Pune Univ)", "Approved"),
        ("16", "Prof. Shweta Bhise", "Assistant Professor", "Information Tech", "2021-03-10", "M.Tech (COEP)", "Approved"),
        ("17", "Dr. Santosh Jagtap", "Associate Professor", "Computer Science", "2018-09-01", "Ph.D (SPPU)", "Approved"),
        ("18", "Dr. Prachi Tendulkar", "Associate Professor", "Electronics & Comm", "2019-12-10", "Ph.D (IIT B)", "Approved"),
        ("19", "Dr. Nitin Mane", "Associate Professor", "Information Tech", "2020-04-05", "Ph.D (VJTI)", "Approved"),
        ("20", "Prof. Rohan Jadhav", "Assistant Professor", "Computer Science", "2023-08-01", "M.Tech (Pune Univ)", "Approved"),
        ("21", "Prof. Anjali Saxena", "Assistant Professor", "Computer Science", "2022-09-15", "M.Tech (IIIT H)", "Approved"),
        ("22", "Prof. Mahesh Pawar", "Assistant Professor", "Electronics & Comm", "2023-01-20", "M.Tech (NIT Trichy)", "Approved"),
        ("23", "Prof. Swati Gholap", "Assistant Professor", "Information Tech", "2022-10-01", "M.Tech (COEP)", "Approved"),
        ("24", "Prof. Chetan Salunkhe", "Assistant Professor", "Information Tech", "2023-05-12", "M.Tech (SPPU)", "Approved"),
    ]

    y_pos = height - 210
    for s_no, name, desig, dept, doj, qual, st in faculty_dataset:
        bg_col = (0.97, 0.98, 1.0) if int(s_no) % 2 == 0 else (1, 1, 1)
        c.setFillColorRGB(*bg_col)
        c.rect(45, y_pos - 3, width - 90, 13, fill=1, stroke=0)
        c.setStrokeColorRGB(0.9, 0.92, 0.95)
        c.setLineWidth(0.5)
        c.rect(45, y_pos - 3, width - 90, 13, fill=0, stroke=1)

        c.setFillColorRGB(0.15, 0.2, 0.3)
        c.setFont("Helvetica", 6.5)
        c.drawString(48, y_pos + 1, s_no)
        c.drawString(75, y_pos + 1, name)
        c.setFont("Helvetica-Bold", 6.5) if "Professor" in desig else c.setFont("Helvetica", 6.5)
        c.drawString(175, y_pos + 1, desig)
        c.setFont("Helvetica", 6.5)
        c.drawString(275, y_pos + 1, dept)
        c.drawString(365, y_pos + 1, doj)
        c.drawString(425, y_pos + 1, qual)
        c.setFillColorRGB(0.05, 0.45, 0.2)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(485, y_pos + 1, st)
        y_pos -= 13

    # Signoff Box
    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(45, y_pos - 10, "ATTESTATION OF INSTITUTIONAL HEAD & TRUST MANAGEMENT:")
    c.setFont("Helvetica", 6.5)
    c.drawString(45, y_pos - 20, "Certified that all 24 faculty members are employed on full-time regular basis under AICTE 7th CPC Pay Scale.")
    c.drawString(45, y_pos - 30, "No faculty member is recorded on concurrent payroll at any other technical institution.")

    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(380, y_pos - 50, "PRINCIPAL & DIRECTOR")
    c.setFont("Helvetica", 6.5)
    c.drawString(380, y_pos - 58, "Apex Institute of Tech & Sciences")
    c.setStrokeColorRGB(0.2, 0.3, 0.5)
    c.rect(375, y_pos - 68, 130, 28)

    draw_footer_and_pki(c, width, height, "ROSTER-2026-AICTE-3349", is_valid=True)
    c.save()


def generate_compliant_land_deed(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    draw_official_border_and_banner(
        c, width, height,
        "Office of the Sub-Registrar • Registration & Stamps Department",
        "REGISTERED LAND CONVEYANCE TITLE DEED & SCHEDULE OF PROPERTY"
    )

    # Metadata Box
    c.setFillColorRGB(0.96, 0.97, 0.99)
    c.rect(45, height - 165, width - 90, 52, fill=1, stroke=0)
    c.setStrokeColorRGB(0.85, 0.88, 0.93)
    c.setLineWidth(0.8)
    c.rect(45, height - 165, width - 90, 52, fill=0, stroke=1)

    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(55, height - 123, "Document Registration No: BND-10482/2012")
    c.drawString(320, height - 123, "Date of Registration: 18/04/2012")
    c.drawString(55, height - 138, "AICTE Permanent ID: 1-3349182390")
    c.drawString(320, height - 138, "Ownership: Freehold (Society Title)")
    c.drawString(55, height - 153, "Institution: Apex Institute of Technology & Sciences, Pune, Maharashtra")

    # Statutory Narrative
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 185, "1. SCHEDULE OF INSTITUTIONAL CAMPUS LAND & TITLE DETAILS")
    c.setFont("Helvetica", 8)
    c.drawString(45, height - 200, "This registered instrument witnesses that the contiguous parcel of land situated at Survey / Khasra No 104/1A and 104/1B")
    c.drawString(45, height - 212, "in Haveli Taluka, District Pune, measuring total area of 25,000 square meters is owned in absolute freehold")
    c.drawString(45, height - 224, "by the sponsoring Educational Trust in perpetuity without any mortgage, bank lien, or encumbrance.")
    c.drawString(45, height - 236, "The land has been legally converted for Non-Agricultural Educational Use vide District Collector Order NA/2011/491.")

    # Land Survey Table
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 256, "2. BOUNDARY DELIMITATION & SURVEY SPECIFICATIONS")

    c.setFillColorRGB(0.2, 0.28, 0.45)
    c.rect(45, height - 276, width - 90, 16, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(55, height - 268, "Survey / Khasra No")
    c.drawString(180, height - 268, "Land Area (Sq.m / Hectares)")
    c.drawString(340, height - 268, "NA Conversion Order")
    c.drawString(460, height - 268, "Title Status")

    land_rows = [
        ("Survey No. 104/1A", "15,000 sq.m (1.50 Hectare)", "Collector Order NA/2011/491", "Freehold"),
        ("Survey No. 104/1B", "10,000 sq.m (1.00 Hectare)", "Collector Order NA/2011/492", "Freehold"),
    ]

    y_pos = height - 292
    for s_no, a_txt, na_txt, own_txt in land_rows:
        c.setFillColorRGB(0.97, 0.98, 1.0)
        c.rect(45, y_pos - 4, width - 90, 15, fill=1, stroke=0)
        c.setStrokeColorRGB(0.9, 0.92, 0.95)
        c.setLineWidth(0.5)
        c.rect(45, y_pos - 4, width - 90, 15, fill=0, stroke=1)

        c.setFillColorRGB(0.15, 0.2, 0.3)
        c.setFont("Helvetica", 7.5)
        c.drawString(55, y_pos + 1, s_no)
        c.drawString(180, y_pos + 1, a_txt)
        c.drawString(340, y_pos + 1, na_txt)
        c.setFillColorRGB(0.05, 0.45, 0.2)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(460, y_pos + 1, own_txt)
        y_pos -= 16

    # Total Row
    c.setFillColorRGB(0.92, 0.95, 0.98)
    c.rect(45, y_pos - 4, width - 90, 16, fill=1, stroke=0)
    c.setFillColorRGB(0.1, 0.2, 0.4)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(55, y_pos + 1, "TOTAL CONTIGUOUS CAMPUS LAND AREA")
    c.drawString(460, y_pos + 1, "25,000 SQ.M")
    y_pos -= 25

    # Verification Note
    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, y_pos, "3. SUB-REGISTRAR CERTIFICATE OF ENCUMBRANCE")
    c.setFont("Helvetica", 8)
    c.drawString(45, y_pos - 14, "• Verified from Land Revenue Registry: 0 encumbrances recorded for the preceding 30 years.")
    c.drawString(45, y_pos - 26, "• The title deed satisfies the AICTE requirement of minimum 10,000 sq.m contiguous campus area.")

    # Signature
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(380, y_pos - 75, "SUB-REGISTRAR")
    c.setFont("Helvetica", 7.5)
    c.drawString(380, y_pos - 85, "Department of Land Revenue & Stamps")
    c.drawString(380, y_pos - 95, "Government of Maharashtra")
    c.setStrokeColorRGB(0.2, 0.3, 0.5)
    c.rect(375, y_pos - 105, 130, 36)

    draw_footer_and_pki(c, width, height, "DEED-2012-PUN-10482", is_valid=True)
    c.save()


# ==========================================
# 2. DOUBTFUL / DEFICIENT SUITE GENERATORS
# ==========================================

def generate_expired_fire_noc(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    draw_official_border_and_banner(
        c, width, height,
        "Directorate of Fire Prevention & Emergency Services",
        "NO OBJECTION CERTIFICATE (EXPIRED COMPLIANCE RECORD)",
        banner_color=(0.55, 0.35, 0.1)
    )

    # Metadata Box with EXPIRED warning
    c.setFillColorRGB(0.99, 0.96, 0.95)
    c.rect(45, height - 165, width - 90, 52, fill=1, stroke=0)
    c.setStrokeColorRGB(0.93, 0.75, 0.75)
    c.setLineWidth(0.8)
    c.rect(45, height - 165, width - 90, 52, fill=0, stroke=1)

    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(55, height - 123, "Certificate Ref No: K-FIRE-2023-881")
    c.drawString(320, height - 123, "Date of Issue: 10/03/2024")
    c.drawString(55, height - 138, "AICTE Permanent ID: 1-7729103940")
    c.setFillColorRGB(0.8, 0.1, 0.1)
    c.drawString(320, height - 138, "VALID UP TO: 09/03/2025 (EXPIRED)")
    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.drawString(55, height - 153, "Institution: Apex Global College of Pharmacy & Research, Bengaluru")

    # Narrative
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 185, "1. CONDITIONAL LIFE SAFETY CLEARANCE (PAST SESSION)")
    c.setFont("Helvetica", 8)
    c.drawString(45, height - 200, "Fire Safety No Objection Certificate was granted for the academic year 2024 with total built-up area of 9,500 sq.m.")
    c.drawString(45, height - 212, "This certificate was issued under Section 13 of Karnataka Fire Force Act with validity strictly up to 09/03/2025.")
    c.setFillColorRGB(0.8, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(45, height - 228, "NOTICE: THIS NOC HAS EXPIRED AND IS NO LONGER VALID FOR AICTE APPROVAL CYCLE 2026-2027.")
    c.setFont("Helvetica", 8)
    c.drawString(45, height - 240, "A fresh comprehensive physical inspection and pressure test report must be filed for statutory renewal.")

    # Signature
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(380, height - 320, "COMMANDANT, FIRE FORCE")
    c.setFont("Helvetica", 7.5)
    c.drawString(380, height - 330, "Karnataka Fire & Emergency Services")
    c.setStrokeColorRGB(0.5, 0.3, 0.3)
    c.rect(375, height - 345, 130, 36)

    draw_footer_and_pki(c, width, height, "K-FIRE-2023-881-EXPIRED", is_valid=False)
    c.save()


def generate_deficient_faculty_roster(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    draw_official_border_and_banner(
        c, width, height,
        "AICTE Statutory Faculty Regulatory & Compliance Cell",
        "FACULTY ROSTER (DEFICIENT CADRE & SKEWED SFR)",
        banner_color=(0.55, 0.35, 0.1)
    )

    # Metadata Box
    c.setFillColorRGB(0.99, 0.98, 0.95)
    c.rect(45, height - 160, width - 90, 48, fill=1, stroke=0)
    c.setStrokeColorRGB(0.9, 0.85, 0.75)
    c.setLineWidth(0.8)
    c.rect(45, height - 160, width - 90, 48, fill=0, stroke=1)

    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(55, height - 123, "AICTE Permanent ID: 1-3349182390")
    c.drawString(320, height - 123, "Academic Session: 2026-2027")
    c.drawString(55, height - 138, "Institution: Deficient Engineering College")
    c.setFillColorRGB(0.8, 0.2, 0.1)
    c.drawString(320, height - 138, "Total Faculty Count: 5 ONLY (DEFICIENT)")
    c.drawString(55, height - 152, "Batch Intake: 360 Seats | Resulting SFR: 1:72.0 (Threshold: <= 1:15)")

    # Faculty Table
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 176, "1. SUBMITTED TEACHING ROSTER (NO PROFESSORS OR HODs)")

    c.setFillColorRGB(0.5, 0.3, 0.15)
    c.rect(45, height - 196, width - 90, 16, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(48, height - 188, "S.No")
    c.drawString(75, height - 188, "Faculty Name")
    c.drawString(175, height - 188, "Designation")
    c.drawString(275, height - 188, "Department")
    c.drawString(365, height - 188, "Joining Date")
    c.drawString(425, height - 188, "Qualification")
    c.drawString(485, height - 188, "Cadre Flag")

    # Only 5 junior Assistant Professors
    deficient_staff = [
        ("1", "Mr. Amit Deshmukh", "Assistant Professor", "Computer Science", "2023-07-01", "B.Tech / M.Tech", "Junior"),
        ("2", "Ms. Pooja Gaikwad", "Assistant Professor", "Computer Science", "2024-01-15", "M.Tech", "Junior"),
        ("3", "Mr. Vikas Sharma", "Assistant Professor", "Computer Science", "2024-02-10", "M.Tech", "Junior"),
        ("4", "Ms. Sneha Patil", "Assistant Professor", "Electronics", "2024-03-01", "M.Tech", "Junior"),
        ("5", "Mr. Vikram Shinde", "Assistant Professor", "Electronics", "2024-04-10", "B.Tech", "Junior"),
    ]

    y_pos = height - 212
    for s_no, name, desig, dept, doj, qual, st in deficient_staff:
        c.setFillColorRGB(0.99, 0.98, 0.95)
        c.rect(45, y_pos - 4, width - 90, 15, fill=1, stroke=0)
        c.setStrokeColorRGB(0.9, 0.85, 0.8)
        c.setLineWidth(0.5)
        c.rect(45, y_pos - 4, width - 90, 15, fill=0, stroke=1)

        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.setFont("Helvetica", 7.5)
        c.drawString(48, y_pos + 1, s_no)
        c.drawString(75, y_pos + 1, name)
        c.drawString(175, y_pos + 1, desig)
        c.drawString(275, y_pos + 1, dept)
        c.drawString(365, y_pos + 1, doj)
        c.drawString(425, y_pos + 1, qual)
        c.setFillColorRGB(0.8, 0.3, 0.1)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(485, y_pos + 1, st)
        y_pos -= 16

    # Deficiency warning box
    c.setFillColorRGB(0.8, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(45, y_pos - 20, "CRITICAL DEFICIENCIES DETECTED UNDER APH CHAPTER II:")
    c.setFont("Helvetica", 7.5)
    c.drawString(45, y_pos - 32, "• Student-to-Faculty Ratio deficit: 1:72 vs mandated ceiling of 1:15.")
    c.drawString(45, y_pos - 44, "• Cadre Ratio violation: 0 Professors and 0 Associate Professors on payroll.")
    c.drawString(45, y_pos - 56, "• Minimum required faculty for 360 intake: 24 full-time approved teachers.")

    draw_footer_and_pki(c, width, height, "ROSTER-DEFICIENT-5-ONLY", is_valid=False)
    c.save()


def generate_minor_mismatch_affiliation(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    draw_official_border_and_banner(
        c, width, height,
        "Office of the Registrar • Affiliation Section",
        "AFFILIATION NOTIFICATION (INTAKE LIMITATION NOTICE)",
        banner_color=(0.55, 0.35, 0.1)
    )

    c.setFillColorRGB(0.99, 0.98, 0.95)
    c.rect(45, height - 165, width - 90, 52, fill=1, stroke=0)
    c.setStrokeColorRGB(0.9, 0.85, 0.8)
    c.setLineWidth(0.8)
    c.rect(45, height - 165, width - 90, 52, fill=0, stroke=1)

    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(55, height - 123, "Affiliation Order No: SPPU/AFFIL/2026/410")
    c.drawString(320, height - 123, "Date of Issue: 22/01/2026")
    c.drawString(55, height - 138, "AICTE Permanent ID: 1-3349182390")
    c.drawString(320, height - 138, "Sanctioned Intake: 240 Seats Only")
    c.drawString(55, height - 153, "Institution: Apex Institute of Technology & Sciences")

    # Narrative
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 185, "1. RESTRICTED INTAKE SANCTION FOR AY 2026-2027")
    c.setFont("Helvetica", 8)
    c.drawString(45, height - 200, "The Academic Council has sanctioned an intake capacity of 240 seats only in Computer Engineering & ECE.")
    c.drawString(45, height - 212, "Requested expansion to 360 seats has been rejected pending laboratory infrastructure completion.")
    c.drawString(45, height - 224, "Total approved sanctioned intake: 240 seats.")

    draw_footer_and_pki(c, width, height, "SPPU-AFFIL-2026-240-SEATS", is_valid=True)
    c.save()


# ==========================================
# 3. RED FLAG / FORGERY SUITE GENERATORS
# ==========================================

def generate_tampered_photoshop_affiliation(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    # Embed Photoshop traces in PDF metadata
    c.setCreator("Adobe Photoshop CC 2024 (Windows)")
    c.setProducer("Adobe Photoshop 25.0 Image Conversion Filter")
    c.setSubject("Manipulated Intake Sanction Order")

    draw_official_border_and_banner(
        c, width, height,
        "Office of the Registrar • Affiliation Division",
        "NOTIFICATION OF SANCTIONED INTAKE (MANIPULATED COPY)",
        banner_color=(0.7, 0.15, 0.15)
    )

    c.setFillColorRGB(0.99, 0.95, 0.95)
    c.rect(45, height - 165, width - 90, 52, fill=1, stroke=0)
    c.setStrokeColorRGB(0.9, 0.7, 0.7)
    c.setLineWidth(0.8)
    c.rect(45, height - 165, width - 90, 52, fill=0, stroke=1)

    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(55, height - 123, "Affiliation Order No: AKTU/AFF/2026/0912")
    c.drawString(320, height - 123, "Date: 12/01/2026")
    c.drawString(55, height - 138, "AICTE Permanent ID: 1-9923847162")
    c.setFillColorRGB(0.8, 0.1, 0.1)
    c.drawString(320, height - 138, "CLAIMED INTAKE: 600 SEATS (INFLATED)")
    c.setFillColorRGB(0.1, 0.15, 0.25)
    c.drawString(55, height - 153, "Institution: Skyline Institute of Technology & Management")

    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, height - 185, "1. FORGED / ALTERED SANCTION ORDER")
    c.setFont("Helvetica", 8)
    c.drawString(45, height - 200, "The University hereby approves Sanctioned Intake: 600 Seats in B.Tech Engineering for Academic Year 2026-2027.")
    c.drawString(45, height - 212, "[Notice: University central database confirms legitimate sanction was only 180 seats. Document edited via Photoshop.]")

    draw_footer_and_pki(c, width, height, "TAMPERED-INTAKE-600-FORGERY", is_valid=False)
    c.save()


def generate_unrelated_homework_report(filepath: Path):
    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4

    # Simple academic report layout (NO statutory borders or government emblems)
    c.setStrokeColorRGB(0.8, 0.8, 0.8)
    c.setLineWidth(1)
    c.rect(40, 40, width - 80, height - 80)

    c.setFillColorRGB(0.1, 0.2, 0.4)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2.0, height - 80, "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING")

    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width / 2.0, height - 105, "Course: CS301 - Computer Organization & Architecture")

    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(width / 2.0, height - 140, "Lab Assignment: Cache Coherence Protocols in Multicore Processors")

    c.setFont("Helvetica", 9)
    c.drawString(60, height - 180, "Student Name: Rohan Verma")
    c.drawString(60, height - 195, "Roll Number: 23BCS041")
    c.drawString(380, height - 180, "Date: 14th October 2026")
    c.drawString(380, height - 195, "Semester: V (Fall Session)")

    c.setStrokeColorRGB(0.85, 0.85, 0.85)
    c.line(60, height - 210, width - 60, height - 210)

    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, height - 230, "1. Abstract & Problem Statement")
    c.setFont("Helvetica", 8.5)
    c.drawString(60, height - 248, "In shared-memory multiprocessor systems, individual processors maintain local private caches to reduce memory latency.")
    c.drawString(60, height - 262, "This introduces the cache coherence problem when multiple caches hold copies of the same memory address.")
    c.drawString(60, height - 276, "This paper evaluates the MESI (Modified, Exclusive, Shared, Invalid) write-invalidate protocol under high contention.")

    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, height - 305, "2. MESI State Transition Diagram & Simulation Results")
    c.setFont("Helvetica", 8.5)
    c.drawString(60, height - 322, "We simulated 8-core CPU executing parallel SPLASH-2 benchmarks. Snooping latency across pipelined bus was measured.")
    c.drawString(60, height - 336, "Write hits in Modified state incur 0 cycle bus overhead, while Shared-to-Modified transitions require invalidation broadcast.")
    c.drawString(60, height - 350, "Average cache line invalidations: 4,120 per million clock cycles. Speedup attained: 6.4x on 8 cores.")

    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, height - 380, "3. Conclusion & Student Reflections")
    c.setFont("Helvetica", 8.5)
    c.drawString(60, height - 398, "Directory-based coherence protocols scale significantly better than snooping buses for core counts exceeding 16.")
    c.drawString(60, height - 412, "Submitted as partial fulfillment of laboratory assessment curriculum requirements.")

    c.setFont("Helvetica-Oblique", 8)
    c.drawString(60, 60, "Document Type: Student Laboratory Assignment • Non-Statutory Academic Report")
    c.save()


def main():
    base = Path("sample_test_documents")
    comp_dir = base / "1_COMPLIANT_DOSSIER"
    doubt_dir = base / "2_DOUBTFUL_DEFICIENT_DOSSIER"
    red_dir = base / "3_REDFLAG_HIGH_RISK_DOSSIER"

    comp_dir.mkdir(parents=True, exist_ok=True)
    doubt_dir.mkdir(parents=True, exist_ok=True)
    red_dir.mkdir(parents=True, exist_ok=True)

    print("Generating Compliant Dossier PDFs...")
    generate_compliant_fire_noc(comp_dir / "01_FIRE_SAFETY_NOC_Compliant.pdf")
    generate_compliant_affiliation(comp_dir / "02_UNIVERSITY_AFFILIATION_Compliant.pdf")
    generate_compliant_faculty_roster(comp_dir / "03_FACULTY_MASTER_ROSTER_Compliant.pdf")
    generate_compliant_land_deed(comp_dir / "04_LAND_TITLE_DEED_Compliant.pdf")

    print("Generating Doubtful / Deficient Dossier PDFs...")
    generate_expired_fire_noc(doubt_dir / "01_FIRE_SAFETY_NOC_Expired.pdf")
    generate_deficient_faculty_roster(doubt_dir / "02_FACULTY_ROSTER_Deficient_SFR.pdf")
    generate_minor_mismatch_affiliation(doubt_dir / "03_UNIVERSITY_AFFILIATION_Minor_Mismatch.pdf")

    print("Generating Red Flag / High Risk Dossier PDFs...")
    generate_tampered_photoshop_affiliation(red_dir / "01_AFFILIATION_Tampered_Intake_Photoshop.pdf")
    generate_unrelated_homework_report(red_dir / "02_UNRELATED_DOCUMENT_Student_Assignment.pdf")

    print("Successfully generated all sample test documents in sample_test_documents/!")

if __name__ == "__main__":
    main()

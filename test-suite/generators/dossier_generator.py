import sys
import os
import io
import logging
from typing import Dict, List
from pathlib import Path

try:
    from PIL import Image, ImageDraw
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False

# Add test-suite root to sys.path
test_suite_root = Path(__file__).resolve().parent.parent
if str(test_suite_root) not in sys.path:
    sys.path.insert(0, str(test_suite_root))

from cases.clean_dossier import CLEAN_DOSSIER_DATA
from cases.expired_noc_dossier import EXPIRED_NOC_DOSSIER_DATA
from cases.tampered_intake_dossier import TAMPERED_INTAKE_DOSSIER_DATA
from cases.duplicate_photo_dossier import DUPLICATE_PHOTO_DOSSIER_DATA
from cases.ghost_faculty_dossier import GHOST_FACULTY_DOSSIER_DATA

logger = logging.getLogger("test_suite.generator")

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab not found in current environment. Using clean binary PDF generator fallback.")


class SyntheticDossierGenerator:
    """
    Automated generator synthesizing 5 comprehensive AICTE regulatory test dossiers.
    Creates high-fidelity PDF certificates, tabular faculty sheets, and EXIF-tagged facility photos.
    """

    def __init__(self, output_dir: str = "test-suite/generated_dossiers"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.test_cases = [
            CLEAN_DOSSIER_DATA,
            EXPIRED_NOC_DOSSIER_DATA,
            TAMPERED_INTAKE_DOSSIER_DATA,
            DUPLICATE_PHOTO_DOSSIER_DATA,
            GHOST_FACULTY_DOSSIER_DATA,
        ]

    def generate_all_dossiers(self) -> Dict[str, List[Path]]:
        """
        Synthesizes files for all 5 test scenarios.
        """
        generated_manifest = {}
        for case in self.test_cases:
            case_id = case["case_id"]
            case_dir = self.output_dir / case_id
            case_dir.mkdir(parents=True, exist_ok=True)
            files = []

            for doc in case["documents"]:
                filename = doc["filename"]
                filepath = case_dir / filename

                if filename.lower().endswith(".pdf"):
                    self._generate_pdf_file(filepath, doc["type"], doc["content_text"], case)
                elif filename.lower().endswith((".jpg", ".jpeg", ".png")):
                    self._generate_image_file(filepath, doc["content_text"], case)

                files.append(filepath)

            generated_manifest[case_id] = files
            logger.info(f"Synthesized {len(files)} files for {case_id} in {case_dir}")

        return generated_manifest

    def _generate_pdf_file(self, filepath: Path, doc_type: str, text: str, case: dict):
        """
        Creates authentic statutory PDF document with rich institutional layout,
        legal clauses, formatted tables, regulatory seals, and PKI metadata.
        """
        if REPORTLAB_AVAILABLE:
            c = canvas.Canvas(str(filepath), pagesize=A4)
            width, height = A4

            if "TAMPERED" in case["case_id"].upper():
                c.setCreator("Adobe Photoshop CC 2023")
                c.setProducer("Adobe Photoshop CC 2023")
            else:
                c.setCreator("AICTE Regulatory Document Server")
                c.setProducer("Government Statutory Portal")

            if "FIRE" in doc_type:
                self._draw_fire_noc_pdf(c, width, height, text, case)
            elif "AFFILIATION" in doc_type:
                self._draw_affiliation_letter_pdf(c, width, height, text, case)
            elif "FACULTY" in doc_type:
                self._draw_faculty_roster_pdf(c, width, height, text, case)
            elif "LAND" in doc_type or "DEED" in doc_type:
                self._draw_land_deed_pdf(c, width, height, text, case)
            else:
                self._draw_generic_statutory_pdf(c, width, height, doc_type, text, case)

            c.save()
        else:
            # Fallback binary PDF generator with complete statutory text streams
            pdf_bytes = self._create_pure_pdf_bytes(doc_type, text, case)
            filepath.write_bytes(pdf_bytes)

    def _generate_image_file(self, filepath: Path, text: str, case: dict):
        """
        Creates synthetic facility image with rendered text label and real EXIF GPS tags.
        """
        if PILLOW_AVAILABLE:
            img = Image.new("RGB", (800, 600), color=(30, 41, 59))
            draw = ImageDraw.Draw(img)

            draw.rectangle([20, 20, 780, 580], outline=(59, 130, 246), width=3)
            draw.text((40, 50), f"AICTE CAMPUS FACILITY PHOTOGRAPH: {case['institution']['name']}", fill=(255, 255, 255))
            draw.text((40, 90), f"AICTE ID: {case['institution']['aictePermanentId']}", fill=(147, 197, 253))

            y = 150
            for line in text.split("\n"):
                draw.text((40, y), line, fill=(226, 232, 240))
                y += 24

            # Embed EXIF GPS tags
            is_dup = "duplicate" in case["case_id"].lower()
            lat = 16.9820 if is_dup else case["institution"].get("geoCoordinates", {}).get("latitude", 18.5204)
            lon = 78.1120 if is_dup else case["institution"].get("geoCoordinates", {}).get("longitude", 73.8567)

            exif = img.getexif()
            gps_ifd = exif.get_ifd(0x8825)
            lat_d = int(abs(lat))
            lat_m = int((abs(lat) - lat_d) * 60)
            lat_s = round(((abs(lat) - lat_d) * 60 - lat_m) * 60, 2)
            lon_d = int(abs(lon))
            lon_m = int((abs(lon) - lon_d) * 60)
            lon_s = round(((abs(lon) - lon_d) * 60 - lon_m) * 60, 2)

            gps_ifd[1] = "N" if lat >= 0 else "S"
            gps_ifd[2] = (lat_d, lat_m, lat_s)
            gps_ifd[3] = "E" if lon >= 0 else "W"
            gps_ifd[4] = (lon_d, lon_m, lon_s)

            img.save(filepath, format="JPEG", quality=90, exif=exif)

            # Register duplicate photo dHash into registry for dynamic matching
            if is_dup:
                try:
                    from services.forensics.core.phash_matcher import PerceptualHashMatcher
                    matcher = PerceptualHashMatcher()
                    computed = matcher.compute_phash(filepath.read_bytes())
                    matcher.facility_hash_registry[computed] = {
                        "id": "DOC-PHOTO-HISTORICAL-001",
                        "institution": "Sri Krishna College of Technology",
                        "facility_name": "Advanced Physics Laboratory (Room 204)",
                    }
                    matcher._save_registry()
                except Exception as p_err:
                    logger.debug(f"Could not register test duplicate hash: {p_err}")
        else:
            # Minimal binary JPEG fallback
            filepath.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\xff\xd9")


    def _draw_official_header_and_seal(self, c, width, height, dept_title: str, sub_title: str):
        # Outer Double Border
        c.setStrokeColorRGB(0.12, 0.23, 0.45)
        c.setLineWidth(2)
        c.rect(30, 30, width - 60, height - 60)
        c.setStrokeColorRGB(0.7, 0.75, 0.85)
        c.setLineWidth(0.8)
        c.rect(34, 34, width - 68, height - 68)

        # Top Banner Accent
        c.setFillColorRGB(0.12, 0.23, 0.45)
        c.rect(34, height - 75, width - 68, 41, fill=1, stroke=0)

        # Government Emblem & Title
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(width / 2.0, height - 52, "GOVERNMENT OF INDIA / STATUTORY REGULATORY BODY")
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(width / 2.0, height - 68, dept_title.upper())

        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(width / 2.0, height - 95, sub_title)

        c.setStrokeColorRGB(0.8, 0.85, 0.9)
        c.setLineWidth(1)
        c.line(45, height - 105, width - 45, height - 105)

    def _draw_footer_and_pki(self, c, width, height, ref_code: str, qr_data: str = ""):
        c.setStrokeColorRGB(0.8, 0.85, 0.9)
        c.setLineWidth(1)
        c.line(45, 95, width - 45, 95)

        # Generate real QR code image if qr_data is specified
        qr_drawn = False
        if qr_data:
            try:
                import qrcode
                qr_img = qrcode.make(qr_data)
                temp_qr = self.output_dir / f"temp_qr_{abs(hash(ref_code))}.png"
                qr_img.save(str(temp_qr))
                c.drawImage(str(temp_qr), width - 95, 42, 50, 50)
                qr_drawn = True
            except Exception as qr_err:
                logger.debug(f"Could not render QR image: {qr_err}")

        if not qr_drawn:
            c.setStrokeColorRGB(0.2, 0.3, 0.5)
            c.setLineWidth(1)
            c.rect(width - 95, 42, 50, 50)
            c.setFont("Helvetica-Bold", 6)
            c.drawCentredString(width - 70, 68, "AICTE / PKI")
            c.drawCentredString(width - 70, 58, "VERIFIED")
            c.drawCentredString(width - 70, 48, "[QR CODE]")

        # Footer Signoff Text
        c.setFillColorRGB(0.2, 0.25, 0.35)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(45, 82, "Digitally Signed and Authenticated under Indian Information Technology Act, 2000.")
        c.setFont("Helvetica", 7)
        c.drawString(45, 71, f"Digital Token ID: CERT-{ref_code.replace(' ', '-')} | Timestamp: 2026-01-15T09:30:00Z | SHA-256 Digest: Validated")
        c.drawString(45, 60, "Official Regulatory Document - Unauthorized tampering or duplication is a punishable offense under Sections 463/471 IPC.")
        c.drawString(45, 49, "AICTE e-Pramaan National Compliance Infrastructure • Central Regulatory Record Repository")

    def _draw_fire_noc_pdf(self, c, width, height, text: str, case: dict):
        self._draw_official_header_and_seal(
            c, width, height,
            "Directorate of Fire & Emergency Services",
            "STATUTORY NO OBJECTION CERTIFICATE (NBC PART IV COMPLIANCE)"
        )

        inst = case["institution"]
        app = case["application"]

        # Meta Details Box
        c.setFillColorRGB(0.96, 0.97, 0.99)
        c.rect(45, height - 170, width - 90, 58, fill=1, stroke=0)
        c.setStrokeColorRGB(0.85, 0.88, 0.93)
        c.setLineWidth(0.8)
        c.rect(45, height - 170, width - 90, 58, fill=0, stroke=1)

        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(55, height - 123, f"Certificate Ref No: MH-FIRE-2026-0921")
        c.drawString(320, height - 123, f"Date of Issue: 15/01/2026")
        c.drawString(55, height - 138, f"AICTE Permanent ID: {inst.get('aictePermanentId', '1-4928172911')}")
        c.drawString(320, height - 138, f"Application Ref: {app.get('applicationNumber', 'AICTE-2026-EOA-1082')}")
        c.drawString(55, height - 153, f"Institutional Name: {inst.get('name', 'Institute of Engineering')}")
        c.drawString(55, height - 165, f"Location & Jurisdiction: District: {inst.get('district', 'Pune')}, State: {inst.get('state', 'Maharashtra')}")

        # Statutory Inspection Narrative
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, height - 188, "1. STATUTORY INSPECTION & SCOPE OF CLEARANCE")
        c.setFont("Helvetica", 8)
        c.drawString(45, height - 202, "This certificate is issued pursuant to physical site inspection conducted by the Technical Scrutiny Board in accordance")
        c.drawString(45, height - 214, "with the Maharashtra Fire Prevention and Life Safety Measures Act and National Building Code of India (Part IV).")
        c.drawString(45, height - 226, f"The educational campus comprising Total Land Area of {inst.get('landDetails', {}).get('totalAreaSqm', 18500):,} sq.m and Institutional Built-Up Area")
        c.drawString(45, height - 238, "of 18,500 sq.m has been verified for all life-safety and active/passive fire suppression infrastructure.")

        # Infrastructure Specifications Table
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, height - 258, "2. SCHEDULE OF VERIFIED FIRE SAFETY INSTALLATIONS")

        # Table header
        c.setFillColorRGB(0.2, 0.28, 0.45)
        c.rect(45, height - 280, width - 90, 16, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(55, height - 272, "Safety Component")
        c.drawString(240, height - 272, "Prescribed AICTE / NBC Norm")
        c.drawString(410, height - 272, "Inspected Status")

        rows = [
            ("Dedicated Static Underground Water Tank", "Minimum 100,000 Litres Capacity", "Verified (120,000 L Operational)"),
            ("Overhead Terrace Water Reservoir", "Minimum 25,000 Litres Capacity", "Verified (30,000 L Functional)"),
            ("Automatic Sprinkler & Smoke Detection", "Coverage across all Academic Labs & Server Rooms", "Installed & Certified Functional"),
            ("Pressurized Emergency Exit Staircases", "Minimum 2 independent staircases >= 2.0m width", "Verified 2 Staircases (2.2m clear)"),
            ("Portable First-Aid Extinguishers", "ISI-Marked ABC (6kg) & CO2 (4.5kg) on every floor", "65 Units Inspected & Charged"),
            ("Fire Fighting Wet Riser & Yard Hydrants", "100mm Internal Riser with Landing Valves", "Full Hydraulic Pressure Confirmed"),
        ]

        y_pos = height - 296
        for idx, (item, req, status_txt) in enumerate(rows):
            bg_col = (0.97, 0.98, 1.0) if idx % 2 == 0 else (1, 1, 1)
            c.setFillColorRGB(*bg_col)
            c.rect(45, y_pos - 4, width - 90, 15, fill=1, stroke=0)
            c.setStrokeColorRGB(0.9, 0.92, 0.95)
            c.setLineWidth(0.5)
            c.rect(45, y_pos - 4, width - 90, 15, fill=0, stroke=1)

            c.setFillColorRGB(0.15, 0.2, 0.3)
            c.setFont("Helvetica", 7.5)
            c.drawString(52, y_pos + 1, item)
            c.drawString(240, y_pos + 1, req)
            c.setFillColorRGB(0.05, 0.45, 0.2)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(410, y_pos + 1, status_txt)
            y_pos -= 16

        # Specific input text excerpt
        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, y_pos - 15, "3. STATUTORY NOTICE & CONDITIONS OF CERTIFICATION")
        c.setFont("Helvetica", 8)
        curr_y = y_pos - 28
        for line in text.split("\n"):
            c.drawString(50, curr_y, line[:95])
            curr_y -= 13

        c.drawString(45, curr_y - 6, "• Mandatory requirement: Mock evacuation drills shall be executed at minimum interval of 6 months.")
        c.drawString(45, curr_y - 18, "• Any unauthorized architectural alteration or corridor blockage shall automatically invalidate this NOC.")

        # Authority Signature
        c.setFont("Helvetica-Bold", 8)
        c.drawString(380, curr_y - 50, "CHIEF FIRE OFFICER")
        c.setFont("Helvetica", 7.5)
        c.drawString(380, curr_y - 60, "Division of Fire & Emergency Services")
        c.drawString(380, curr_y - 70, "Government of Maharashtra")
        c.setStrokeColorRGB(0.2, 0.3, 0.5)
        c.rect(375, curr_y - 82, 130, 36)

        ref_no = "MH-FIRE-2024-EXP" if "EXPIRED" in case["case_id"].upper() else "MH-FIRE-2026-0921"
        valid_date = "2025-03-09" if "EXPIRED" in case["case_id"].upper() else "2027-01-14"
        qr_url = f"https://verify.dte.gov.in/statutory/cert?id={ref_no}&intake=420&valid={valid_date}"
        self._draw_footer_and_pki(c, width, height, ref_no, qr_url)
        c.showPage()

    def _draw_affiliation_letter_pdf(self, c, width, height, text: str, case: dict):
        self._draw_official_header_and_seal(
            c, width, height,
            "Office of the Registrar • Affiliation Division",
            "NOTIFICATION OF STATUTORY UNIVERSITY AFFILIATION (ACADEMIC YEAR 2026-2027)"
        )

        inst = case["institution"]
        app = case["application"]

        # Meta Details Box
        c.setFillColorRGB(0.96, 0.97, 0.99)
        c.rect(45, height - 170, width - 90, 58, fill=1, stroke=0)
        c.setStrokeColorRGB(0.85, 0.88, 0.93)
        c.setLineWidth(0.8)
        c.rect(45, height - 170, width - 90, 58, fill=0, stroke=1)

        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(55, height - 123, f"Affiliation Order No: SPPU/AFFIL/2026/882")
        c.drawString(320, height - 123, f"Date: 22/01/2026")
        c.drawString(55, height - 138, f"AICTE Permanent ID: {inst.get('aictePermanentId', '1-4928172911')}")
        c.drawString(320, height - 138, f"Academic Council Resolution: AC/RES/2026-44")
        c.drawString(55, height - 153, f"Institution: {inst.get('name', 'Institute of Engineering')}")
        c.drawString(55, height - 165, f"Campus: District {inst.get('district', 'Pune')}, State: {inst.get('state', 'Maharashtra')}")

        # University Sanction Narrative
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, height - 188, "1. STATUTORY GRANT OF PROVISIONAL AFFILIATION")
        c.setFont("Helvetica", 8)
        c.drawString(45, height - 202, "In exercise of the powers conferred under Section 108 of the Public Universities Act and AICTE Approval Process")
        c.drawString(45, height - 214, "Handbook (APH 2026-2027), provisional affiliation is hereby granted to the undermentioned undergraduate engineering")
        c.drawString(45, height - 226, f"courses with sanctioned intake capacity of {app.get('requestedIntake', 420)} seats for the academic session 2026-2027.")

        # Sanctioned Course Breakdown Table
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, height - 248, "2. APPROVED PROGRAMMES & SANCTIONED SEAT INTAKE")

        c.setFillColorRGB(0.2, 0.28, 0.45)
        c.rect(45, height - 268, width - 90, 16, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(55, height - 260, "Undergraduate / Postgraduate Program")
        c.drawString(260, height - 260, "Degree Level")
        c.drawString(350, height - 260, "Shift / Status")
        c.drawString(440, height - 260, "Sanctioned Intake")

        total_intake = app.get("requestedIntake", 420)
        # Distribute into authentic engineering programs
        cs_intake = int(total_intake * 0.42)
        it_intake = int(total_intake * 0.15)
        ece_intake = int(total_intake * 0.28)
        mech_intake = total_intake - (cs_intake + it_intake + ece_intake)

        prog_rows = [
            ("Computer Engineering & Technology", "B.Tech (4 Years)", "Regular - First Shift", f"{cs_intake} Seats"),
            ("Electronics & Communication Engineering", "B.Tech (4 Years)", "Regular - First Shift", f"{ece_intake} Seats"),
            ("Information Technology & Computing", "B.Tech (4 Years)", "Regular - First Shift", f"{it_intake} Seats"),
            ("Mechanical & Automation Engineering", "B.Tech (4 Years)", "Regular - First Shift", f"{mech_intake} Seats"),
        ]

        y_pos = height - 284
        for idx, (p_name, level, shift, seat_txt) in enumerate(prog_rows):
            bg_col = (0.97, 0.98, 1.0) if idx % 2 == 0 else (1, 1, 1)
            c.setFillColorRGB(*bg_col)
            c.rect(45, y_pos - 4, width - 90, 15, fill=1, stroke=0)
            c.setStrokeColorRGB(0.9, 0.92, 0.95)
            c.setLineWidth(0.5)
            c.rect(45, y_pos - 4, width - 90, 15, fill=0, stroke=1)

            c.setFillColorRGB(0.15, 0.2, 0.3)
            c.setFont("Helvetica", 7.5)
            c.drawString(52, y_pos + 1, p_name)
            c.drawString(260, y_pos + 1, level)
            c.drawString(350, y_pos + 1, shift)
            c.setFillColorRGB(0.1, 0.2, 0.5)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(440, y_pos + 1, seat_txt)
            y_pos -= 16

        # Total Bar
        c.setFillColorRGB(0.92, 0.95, 0.98)
        c.rect(45, y_pos - 4, width - 90, 16, fill=1, stroke=0)
        c.setFillColorRGB(0.1, 0.2, 0.4)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(52, y_pos + 1, "TOTAL SANCTIONED INTAKE CAPACITY (ACADEMIC YEAR 2026-2027)")
        c.drawString(440, y_pos + 1, f"{total_intake} SEATS")
        y_pos -= 25

        # Statutory Conditions
        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, y_pos, "3. MANDATORY CONDITIONS OF AFFILIATION & REGULATORY COMPLIANCE")
        c.setFont("Helvetica", 8)
        c.drawString(45, y_pos - 14, "1. Cadre Ratio & SFR: The institution shall mandatorily maintain a Student-to-Faculty Ratio of <= 1:15.")
        c.drawString(45, y_pos - 26, "2. Faculty Appointments: All faculty recruitment must strictly adhere to AICTE Sixth/Seventh Pay Commission scales.")
        c.drawString(45, y_pos - 38, f"3. Strict Intake Barrier: Admission beyond {total_intake} seats is illegal and will invite immediate de-affiliation.")
        c.drawString(45, y_pos - 50, "4. Physical Infrastructure: Laboratory and digital library facilities must conform to AICTE Norms Appendix 4.")

        # Excerpt of provided case text
        c.setFont("Helvetica-Bold", 8)
        c.drawString(45, y_pos - 72, "4. UNIVERSITY NOTIFICATION EXTRACT:")
        c.setFont("Helvetica-Oblique", 7.5)
        curr_y = y_pos - 84
        for line in text.split("\n"):
            c.drawString(50, curr_y, line[:95])
            curr_y -= 12

        # Signatures
        c.setFont("Helvetica-Bold", 8)
        c.drawString(380, curr_y - 30, "REGISTRAR")
        c.setFont("Helvetica", 7.5)
        c.drawString(380, curr_y - 40, "Statutory State University")
        c.drawString(380, curr_y - 50, "Controller of Affiliations")
        c.setStrokeColorRGB(0.2, 0.3, 0.5)
        c.rect(375, curr_y - 62, 130, 36)

        ref_no = "AKTU/AFF/2026/0912" if "TAMPERED" in case["case_id"].upper() else "SPPU-AFFIL-2026-882"
        qr_intake = 180 if "TAMPERED" in case["case_id"].upper() else total_intake
        qr_url = f"https://verify.dte.gov.in/statutory/cert?id={ref_no}&intake={qr_intake}&valid=2027-01-14"
        self._draw_footer_and_pki(c, width, height, ref_no, qr_url)
        c.showPage()

    def _draw_faculty_roster_pdf(self, c, width, height, text: str, case: dict):
        self._draw_official_header_and_seal(
            c, width, height,
            "AICTE Central Verification & Faculty Regulatory Cell",
            "FACULTY MASTER ROSTER & CADRE RATIO VERIFICATION ATTESTATION"
        )

        inst = case["institution"]
        app = case["application"]

        # Meta Details Box
        c.setFillColorRGB(0.96, 0.97, 0.99)
        c.rect(45, height - 160, width - 90, 48, fill=1, stroke=0)
        c.setStrokeColorRGB(0.85, 0.88, 0.93)
        c.setLineWidth(0.8)
        c.rect(45, height - 160, width - 90, 48, fill=0, stroke=1)

        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(55, height - 123, f"AICTE Permanent ID: {inst.get('aictePermanentId', '1-4928172911')}")
        c.drawString(320, height - 123, f"Academic Session: {app.get('academicYear', '2026-2027')}")
        c.drawString(55, height - 138, f"Institution: {inst.get('name', 'Institute of Engineering')}")
        c.drawString(320, height - 138, f"Total Students Enrolled: {app.get('totalStudentEnrolled', 1580):,}")
        c.drawString(55, height - 152, f"Sanctioned Intake: {app.get('requestedIntake', 420)} Seats | Mandated SFR: 1:15 (Engineering UG)")

        # Faculty Table
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, height - 176, "1. FACULTY CADRE ROSTER & NATIONAL IDENTITY HASHES")

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
        c.drawString(485, height - 188, "Approval")

        # Full authentic faculty dataset
        faculty_rows = [
            ("1", "Dr. Rameshwar Rao", "Professor & HOD", "Computer Science", "2014-06-10", "Ph.D (IIT B)", "Approved"),
            ("2", "Dr. Neha Kulkarni", "Associate Professor", "Computer Science", "2017-08-15", "Ph.D (IISc)", "Approved"),
            ("3", "Prof. Amit Deshmukh", "Assistant Professor", "Computer Science", "2020-07-01", "M.Tech (NIT)", "Approved"),
            ("4", "Pooja Gaikwad", "Assistant Professor", "Computer Science", "2022-01-15", "M.Tech (COEP)", "Approved"),
            ("5", "Dr. Sunita Varma", "Professor", "Electronics & Comm", "2015-09-01", "Ph.D (SPPU)", "Approved"),
            ("6", "Dr. Rajeshwar Patil", "Associate Professor", "Electronics & Comm", "2018-02-12", "Ph.D (VNIT)", "Approved"),
            ("7", "Prof. Vikram Shinde", "Assistant Professor", "Electronics & Comm", "2021-08-10", "M.Tech (VJTI)", "Approved"),
            ("8", "Kavita Joshi", "Assistant Professor", "Electronics & Comm", "2023-04-01", "M.Tech (Pune)", "Approved"),
            ("9", "Dr. Arvind Kulkarni", "Professor", "Mechanical Engg", "2013-11-20", "Ph.D (IIT M)", "Approved"),
            ("10", "Prof. Sachin Bansode", "Assistant Professor", "Mechanical Engg", "2021-01-05", "M.Tech (BATU)", "Approved"),
            ("11", "Dr. Meenakshi Iyer", "Associate Professor", "Information Tech", "2019-06-18", "Ph.D (BITS)", "Approved"),
            ("12", "Prof. Rahul Kadam", "Assistant Professor", "Information Tech", "2022-07-15", "M.Tech (Pune)", "Approved"),
        ]

        y_pos = height - 212
        for s_no, name, desig, dept, doj, qual, status_txt in faculty_rows:
            bg_col = (0.97, 0.98, 1.0) if int(s_no) % 2 == 0 else (1, 1, 1)
            c.setFillColorRGB(*bg_col)
            c.rect(45, y_pos - 3, width - 90, 14, fill=1, stroke=0)
            c.setStrokeColorRGB(0.9, 0.92, 0.95)
            c.setLineWidth(0.5)
            c.rect(45, y_pos - 3, width - 90, 14, fill=0, stroke=1)

            c.setFillColorRGB(0.15, 0.2, 0.3)
            c.setFont("Helvetica", 7)
            c.drawString(50, y_pos + 1, s_no)
            c.setFont("Helvetica-Bold", 7)
            c.drawString(75, y_pos + 1, name)
            c.setFont("Helvetica", 7)
            c.drawString(175, y_pos + 1, desig)
            c.drawString(275, y_pos + 1, dept)
            c.drawString(365, y_pos + 1, doj)
            c.drawString(425, y_pos + 1, qual)
            c.setFillColorRGB(0.05, 0.45, 0.2)
            c.setFont("Helvetica-Bold", 7)
            c.drawString(485, y_pos + 1, status_txt)
            y_pos -= 14

        # Cadre Ratio Summary Card
        c.setFillColorRGB(0.94, 0.96, 0.99)
        c.rect(45, y_pos - 35, width - 90, 32, fill=1, stroke=0)
        c.setStrokeColorRGB(0.8, 0.85, 0.92)
        c.setLineWidth(0.8)
        c.rect(45, y_pos - 35, width - 90, 32, fill=0, stroke=1)

        c.setFillColorRGB(0.1, 0.2, 0.45)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(52, y_pos - 12, "CADRE RATIO ANALYSIS: Cadre Structure: 3 Professors | 3 Associate Professors | 6 Assistant Professors")
        c.setFont("Helvetica", 7.5)
        c.drawString(52, y_pos - 24, "Student-to-Faculty Ratio (SFR): Meets APH Section 7.2 Regulations. National Faculty Portal Cross-Verified.")
        y_pos -= 45

        # Raw lines if any specific case text
        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(45, y_pos - 5, "2. DOSSIER SPECIFIC SUBMISSION RECORD:")
        curr_y = y_pos - 18
        c.setFont("Helvetica", 7)
        for line in text.split("\n"):
            c.drawString(50, curr_y, line[:95])
            curr_y -= 11

        # Signatures
        c.setFont("Helvetica-Bold", 8)
        c.drawString(50, curr_y - 25, "PRINCIPAL / DIRECTOR")
        c.setFont("Helvetica", 7)
        c.drawString(50, curr_y - 35, "Head of Institution Seal")

        c.setFont("Helvetica-Bold", 8)
        c.drawString(380, curr_y - 25, "SECRETARY / CHAIRMAN")
        c.setFont("Helvetica", 7)
        c.drawString(380, curr_y - 35, "Sponsoring Trust / Society")

        self._draw_footer_and_pki(c, width, height, "ROSTER-2026-AICTE-1082", "https://portal.aicte-india.org/faculty/verify?roster=AICTE-2026-1082")
        c.showPage()

    def _draw_land_deed_pdf(self, c, width, height, text: str, case: dict):
        self._draw_official_header_and_seal(
            c, width, height,
            "Office of the Sub-Registrar • Registration & Stamps Department",
            "REGISTERED LAND CONVEYANCE DEED & SCHEDULE OF PROPERTY"
        )
        inst = case["institution"]
        app = case["application"]

        # Meta Details Box
        c.setFillColorRGB(0.96, 0.97, 0.99)
        c.rect(45, height - 160, width - 90, 48, fill=1, stroke=0)
        c.setStrokeColorRGB(0.85, 0.88, 0.93)
        c.setLineWidth(0.8)
        c.rect(45, height - 160, width - 90, 48, fill=0, stroke=1)

        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(55, height - 123, f"Document Registration No: BND-10482/2012")
        c.drawString(320, height - 123, f"Date of Registration: 18/04/2012")
        c.drawString(55, height - 138, f"Institution / Trust: {inst.get('name', 'Educational Society')}")
        c.drawString(320, height - 138, f"AICTE Permanent ID: {inst.get('aictePermanentId', '1-4928172911')}")
        c.drawString(55, height - 152, f"Total Registered Land: {inst.get('landDetails', {}).get('totalAreaSqm', 18500):,} sq.m (Freehold & Unencumbered)")

        # Land Schedule Narrative
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, height - 178, "1. SCHEDULE OF INSTITUTIONAL CAMPUS LAND")
        c.setFont("Helvetica", 8)
        c.drawString(45, height - 192, "This registered instrument witnesses that the parcel of land situated at Survey / Khasra Numbers 88/1 and 88/2")
        c.drawString(45, height - 204, f"in the revenue village of Haveli, District {inst.get('district', 'Pune')}, measuring 18,500 square meters is owned in full")
        c.drawString(45, height - 216, "perpetuity by the institutional society without any bank mortgage, encumbrance, or third-party claim.")

        # Property Boundary Table
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, height - 240, "2. BOUNDARY DELIMITATION & SURVEY PARTICULARS")

        c.setFillColorRGB(0.2, 0.28, 0.45)
        c.rect(45, height - 260, width - 90, 16, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(55, height - 252, "Survey / Khasra No")
        c.drawString(180, height - 252, "Area (Hectares / Sq.m)")
        c.drawString(320, height - 252, "NA Conversion Order")
        c.drawString(450, height - 252, "Ownership")

        land_rows = [
            ("Survey No. 88/1", "1.10 Hectare (11,000 sq.m)", "Collector Order NA/2011/491", "Freehold"),
            ("Survey No. 88/2", "0.75 Hectare (7,500 sq.m)", "Collector Order NA/2011/492", "Freehold"),
        ]

        y_pos = height - 276
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
            c.drawString(320, y_pos + 1, na_txt)
            c.setFillColorRGB(0.05, 0.45, 0.2)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(450, y_pos + 1, own_txt)
            y_pos -= 16

        # Excerpt text
        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(45, y_pos - 15, "3. STATUTORY RECORD EXTRACT:")
        c.setFont("Helvetica", 7.5)
        curr_y = y_pos - 28
        for line in text.split("\n"):
            c.drawString(50, curr_y, line[:95])
            curr_y -= 12

        # Sub registrar seal
        c.setFont("Helvetica-Bold", 8)
        c.drawString(380, curr_y - 30, "SUB-REGISTRAR")
        c.setFont("Helvetica", 7.5)
        c.drawString(380, curr_y - 40, "Department of Registration & Stamps")
        c.drawString(380, curr_y - 50, "Government of Maharashtra")
        c.setStrokeColorRGB(0.2, 0.3, 0.5)
        c.rect(375, curr_y - 62, 130, 36)

        self._draw_footer_and_pki(c, width, height, "DEED-2012-PUN-10482", "https://igrmaharashtra.gov.in/deeds/verify?doc=BND-10482-2012")
        c.showPage()

    def _draw_generic_statutory_pdf(self, c, width, height, doc_type: str, text: str, case: dict):
        self._draw_official_header_and_seal(
            c, width, height,
            "National Regulatory Authority • Statutory Division",
            doc_type.replace("_", " ")
        )
        inst = case["institution"]
        app = case["application"]

        c.setFillColorRGB(0.96, 0.97, 0.99)
        c.rect(45, height - 160, width - 90, 48, fill=1, stroke=0)
        c.setStrokeColorRGB(0.85, 0.88, 0.93)
        c.rect(45, height - 160, width - 90, 48, fill=0, stroke=1)

        c.setFillColorRGB(0.1, 0.15, 0.25)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(55, height - 123, f"Document Reference: AICTE-DOC-{app.get('applicationNumber', 'APP-1000')}")
        c.drawString(320, height - 123, f"Date: 15/01/2026")
        c.drawString(55, height - 138, f"Institution: {inst.get('name', 'Institution')}")
        c.drawString(320, height - 138, f"AICTE ID: {inst.get('aictePermanentId', '1-000000000')}")
        c.drawString(55, height - 152, f"Regulatory Scope: Approved for AICTE Scrutiny & Regulatory Verification")

        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, height - 180, "STATUTORY SUBMISSION & INSPECTION PARTICULARS")
        c.setFont("Helvetica", 8)
        y = height - 200
        for line in text.split("\n"):
            c.drawString(50, y, line[:95])
            y -= 15

        c.drawString(45, y - 20, "This statutory document is certified to be authentic and in full compliance with AICTE norms.")
        self._draw_footer_and_pki(c, width, height, "DOC-STATUTORY-2026", f"https://verify.aicte.gov.in/statutory/cert?id={app.get('applicationNumber', 'APP-1000')}")
        c.showPage()

    def _create_pure_pdf_bytes(self, doc_type: str, text: str, case: dict) -> bytes:
        """
        Pure-python valid PDF byte structure fallback with multi-line statutory layout.
        """
        escaped_type = doc_type.replace("(", "\\(").replace(")", "\\)")
        escaped_inst = case['institution']['name'].replace("(", "\\(").replace(")", "\\)")
        escaped_id = case['institution'].get('aictePermanentId', '').replace("(", "\\(").replace(")", "\\)")
        escaped_app = case['application'].get('applicationNumber', '').replace("(", "\\(").replace(")", "\\)")

        text_lines = [l.replace("(", "\\(").replace(")", "\\)")[:90] for l in text.split("\n") if l.strip()]

        stream_ops = [
            "BT",
            "/F1 14 Tf 50 780 Td (GOVERNMENT OF INDIA / STATUTORY REGULATORY BODY) Tj",
            "/F1 11 Tf 0 -22 Td (" + escaped_type + ") Tj",
            "/F2 9 Tf 0 -25 Td (Institution: " + escaped_inst + ") Tj",
            "0 -15 Td (AICTE Permanent ID: " + escaped_id + " | Application: " + escaped_app + ") Tj",
            "0 -20 Td (-----------------------------------------------------------------------------------------------------) Tj",
            "0 -20 Td (STATUTORY VERIFICATION & COMPLIANCE PARTICULARS:) Tj",
        ]

        for line in text_lines:
            stream_ops.append("0 -15 Td (" + line + ") Tj")

        stream_ops.extend([
            "0 -25 Td (-----------------------------------------------------------------------------------------------------) Tj",
            "/F2 8 Tf 0 -15 Td (Digitally Signed and Validated under Indian IT Act 2000 & PKI Infrastructure.) Tj",
            "0 -12 Td (SHA-256 Chained Integrity State: Verified | Central Regulatory Record Repository) Tj",
            "ET"
        ])

        stream = " ".join(stream_ops)
        stream_len = len(stream)

        pdf = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj
4 0 obj << /Length {stream_len} >> stream
{stream}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj
6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000320 00000 n 
0000000385 00000 n 
trailer << /Size 7 /Root 1 0 R >>
startxref
445
%%EOF"""
        return pdf.encode("latin-1")


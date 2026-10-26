import re
import logging
from typing import Dict, Any, List, Optional
from ..schemas.extracted_data import CertificateAttributesExtracted

logger = logging.getLogger("ocr_service.cert_extractor")


class CertificateAttributeExtractor:
    """
    Targeted key-value extraction pipeline for official AICTE regulatory documents.
    Extracts intake numbers, validity periods, built-up areas, and issuing authorities.
    Only returns parameters actually matched in text; never injects fake defaults.
    """

    def extract_attributes(self, text: str, document_type: str = "OTHER") -> CertificateAttributesExtracted:
        """
        Parses document text for specific regulatory parameters.
        Returns empty/None fields if document is OTHER or patterns do not match.
        """
        if not text or document_type == "OTHER":
            return CertificateAttributesExtracted(
                document_type=document_type,
                document_number=None,
                issuing_authority=None,
                issue_date=None,
                expiry_date=None,
                sanctioned_intake=None,
                builtUpAreaSqm=None,
                survey_numbers=[],
                raw_key_values={},
            )

        doc_number = self._extract_document_number(text)
        issuing_auth = self._extract_issuing_authority(text, document_type)
        issue_date, expiry_date = self._extract_dates(text)
        intake = self._extract_intake(text)
        built_up_area = self._extract_built_up_area(text)
        survey_numbers = self._extract_survey_numbers(text)

        raw_kv = {}
        if doc_number: raw_kv["document_number"] = doc_number
        if issuing_auth: raw_kv["issuing_authority"] = issuing_auth
        if issue_date: raw_kv["issue_date"] = issue_date
        if expiry_date: raw_kv["expiry_date"] = expiry_date
        if intake: raw_kv["sanctioned_intake"] = intake
        if built_up_area: raw_kv["built_up_area_sqm"] = built_up_area
        if survey_numbers: raw_kv["survey_numbers"] = survey_numbers

        return CertificateAttributesExtracted(
            document_type=document_type,
            document_number=doc_number,
            issuing_authority=issuing_auth,
            issue_date=issue_date,
            expiry_date=expiry_date,
            sanctioned_intake=intake,
            builtUpAreaSqm=built_up_area,
            survey_numbers=survey_numbers,
            raw_key_values=raw_kv,
        )

    def _extract_document_number(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:certificate|ref|reference|order|noc|deed|doc)[\s\w\.\:\-]*?((?=[A-Z0-9\/\-_]*\d)[A-Z0-9\/\-_]{4,35})",
            r"(?:file\s+no|dispatch\s+no)[\s\.\:\-]+((?=[A-Z0-9\/\-_]*\d)[A-Z0-9\/\-_]{4,35})",
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip()
                if not candidate.lower() in ["reference", "certificate", "under", "issued"]:
                    return candidate
        return None

    def _extract_issuing_authority(self, text: str, document_type: str) -> Optional[str]:
        if document_type == "FIRE_SAFETY_NOC":
            if re.search(r"state\s+fire|fire\s+and\s+emergency", text, re.IGNORECASE):
                return "State Fire and Emergency Services Department"
            elif re.search(r"directorate\s+of\s+fire|chief\s+fire\s+officer", text, re.IGNORECASE):
                return "Directorate of Fire Prevention & Safety"
            return None
        elif document_type == "UNIVERSITY_AFFILIATION_LETTER":
            univ_match = re.search(r"([A-Z][a-zA-Z\s]+University)", text)
            if univ_match:
                return univ_match.group(1).strip()
            return None
        elif document_type == "LAND_TITLE_DEED":
            if re.search(r"sub-?\s*registrar", text, re.IGNORECASE):
                return "Office of Sub-Registrar / Department of Land Revenue"
            return None
        elif document_type == "BUILDING_PLAN_APPROVAL":
            if re.search(r"municipal|development\s+authority|town\s+planning", text, re.IGNORECASE):
                return "Municipal Development Authority / Town Planning"
            return None
        return None

    def _extract_dates(self, text: str) -> (Optional[str], Optional[str]):
        """
        Extracts issue and expiration dates.
        """
        issue_date = None
        expiry_date = None

        # Look for explicit validity statements: "valid up to ...", "valid until ..."
        expiry_match = re.search(
            r"valid\s+(?:up\s*to|until|through|till)[\s\:\.\-]+(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})",
            text,
            re.IGNORECASE,
        )
        if expiry_match:
            expiry_date = self._normalize_date(expiry_match.group(1))

        # Look for issue date: "dated: ...", "issued on: ..."
        issue_match = re.search(
            r"(?:dated|issued\s+on|date\s+of\s+issue)[\s\:\.\-]+(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})",
            text,
            re.IGNORECASE,
        )
        if issue_match:
            issue_date = self._normalize_date(issue_match.group(1))

        # If not found explicitly, search general dates
        if not issue_date or not expiry_date:
            all_dates = re.findall(
                r"\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})\b",
                text,
            )
            if len(all_dates) >= 2:
                issue_date = issue_date or self._normalize_date(all_dates[0])
                expiry_date = expiry_date or self._normalize_date(all_dates[1])
            elif len(all_dates) == 1:
                issue_date = issue_date or self._normalize_date(all_dates[0])

        return issue_date, expiry_date

    def _extract_intake(self, text: str) -> Optional[int]:
        patterns = [
            r"(?:sanctioned|approved|proposed|seat)\s+intake[\s\:\.\-]+(\d{2,4})",
            r"intake\s+(?:capacity|of)[\s\:\.\-]+(\d{2,4})",
            r"(?:sanctioned\s+intake\s+of|approved\s+for|intake\s+of)\s*(\d{2,4})\s*(?:seats)?",
            r"capacity\s+of\s+(\d{2,4})\s+students",
            r"total\s+(?:sanctioned\s+)?intake.*?(\d{2,4})\s*seats",
            r"total\s+seats\s*[\:\.\-]?\s*(\d{2,4})",
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                try:
                    val = int(match.group(1))
                    if 10 <= val <= 5000:
                        return val
                except ValueError:
                    pass
        return None

    def _extract_built_up_area(self, text: str) -> Optional[float]:
        patterns = [
            r"(?:built-?up|carpet|plinth|total)\s+area[\s\:\.\-]+([\d,\.]+)\s*(?:sq\.?\s*m|m2|sqm|square\s+meters)",
            r"area\s+of[\s\:\.\-]+([\d,\.]+)\s*(?:sq\.?\s*m|m2|sqm|square\s+meters)",
            r"area[\s\:\.\-]+([\d,\.]+)\s*(?:sq\.?\s*m|m2|sqm)",
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                try:
                    cleaned = match.group(1).replace(",", "")
                    val = float(cleaned)
                    if val > 100:
                        return val
                except ValueError:
                    pass
        return None

    def _extract_survey_numbers(self, text: str) -> List[str]:
        match = re.search(r"survey\s+no(?:s|\.|\s)+([\d\s,\/\-]+)", text, re.IGNORECASE)
        if match:
            raw = match.group(1)
            parts = [p.strip() for p in re.split(r"[,;]", raw) if p.strip()]
            return parts[:5]
        return []

    def _normalize_date(self, date_str: str) -> str:
        date_str = date_str.replace("/", "-").replace(".", "-")
        parts = date_str.split("-")
        if len(parts) == 3:
            # If YYYY-MM-DD
            if len(parts[0]) == 4:
                return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
            # If DD-MM-YYYY
            elif len(parts[2]) == 4:
                return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
        return date_str

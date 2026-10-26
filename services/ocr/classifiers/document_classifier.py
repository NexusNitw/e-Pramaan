import re
import logging
from typing import List, Dict, Tuple, Set
from collections import Counter

from ..schemas.classification import PageClassificationResult, DocumentClassificationResponse
from ..parsers.pdf_loader import LoadedDocument, LoadedPage

logger = logging.getLogger("ocr_service.classifier")


class DocumentClassifier:
    """
    Automated multi-class document classifier for AICTE institution dossiers.
    Utilizes weighted terminology clusters, regex signatures, and layout cues.
    """

    TAXONOMY = {
        "FIRE_SAFETY_NOC": {
            "primary": [
                r"fire\s+(?:and\s+rescue\s+)?services?",
                r"no\s+objection\s+certificate",
                r"fire\s+safety\s+certificate",
                r"fire\s+prevention",
                r"national\s+building\s+code.*part\s+iv",
                r"fire\s+fighting\s+system",
                r"chief\s+fire\s+officer",
            ],
            "secondary": [
                r"extinguishers?",
                r"evacuation\s+plan",
                r"validity\s+period",
                r"hazard",
                r"hydraulic\s+test",
                r"noc",
            ],
            "min_score": 2.5,
        },
        "LAND_TITLE_DEED": {
            "primary": [
                r"sale\s+deed",
                r"title\s+deed",
                r"sub-?\s*registrar",
                r"khasra\s+(?:no|number)?",
                r"khatauni",
                r"encumbrance\s+certificate",
                r"land\s+use\s+certificate",
                r"schedule\s+of\s+property",
            ],
            "secondary": [
                r"survey\s+no(?:s|\.|\s)",
                r"acres?",
                r"hectares?",
                r"boundaries",
                r"mutation",
                r"stamp\s+duty",
                r"revenue\s+department",
            ],
            "min_score": 2.5,
        },
        "UNIVERSITY_AFFILIATION_LETTER": {
            "primary": [
                r"(?:grant\s+of\s+)?affiliation",
                r"provisional\s+affiliation",
                r"extension\s+of\s+affiliation",
                r"academic\s+council",
                r"registrar\s+(?:office)?",
                r"statutory\s+university",
                r"approval\s+of\s+programs?",
            ],
            "secondary": [
                r"sanctioned\s+intake",
                r"academic\s+year\s+202\d-?202\d",
                r"vice-?chancellor",
                r"syndicate",
                r"ugc\s+act",
                r"degree\s+awarding",
            ],
            "min_score": 2.5,
        },
        "FACULTY_MASTER_ROSTER": {
            "primary": [
                r"faculty\s+(?:master\s+)?roster",
                r"teaching\s+staff",
                r"list\s+of\s+faculty",
                r"assistant\s+professor",
                r"associate\s+professor",
                r"professor\s+and\s+head",
                r"date\s+of\s+joining",
            ],
            "secondary": [
                r"designation",
                r"qualification",
                r"department",
                r"ph\.?d",
                r"m\.?tech",
                r"pay\s+band",
                r"pan\s+number",
                r"aadhaar",
            ],
            "min_score": 2.5,
        },
        "BUILDING_PLAN_APPROVAL": {
            "primary": [
                r"building\s+plan\s+(?:approval|sanction)",
                r"municipal\s+corporation",
                r"competent\s+authority",
                r"town\s+and\s+country\s+planning",
                r"development\s+authority",
                r"floor\s+area\s+ratio",
                r"built-?up\s+area",
            ],
            "secondary": [
                r"architectural\s+drawing",
                r"ground\s+coverage",
                r"plinth\s+area",
                r"setback",
                r"site\s+plan",
                r"sanctioned\s+order",
            ],
            "min_score": 2.5,
        },
        "INFRASTRUCTURE_PHOTO": {
            "primary": [
                r"facility\s+photograph",
                r"campus\s+(?:facility\s+)?photograph",
                r"laboratory\s+photograph",
                r"cad\s+studio",
                r"computer\s+center",
                r"classroom\s+photograph",
                r"library\s+photograph",
                r"aicte\s+campus\s+facility",
            ],
            "secondary": [
                r"campus",
                r"laboratory",
                r"photograph",
                r"facility",
                r"infrastructure",
            ],
            "min_score": 2.5,
        },
    }

    def classify_page(self, page: LoadedPage) -> PageClassificationResult:
        """
        Classifies an individual page based on text semantics and regex patterns.
        """
        text = page.text.lower()
        if not text:
            # Check if this might be an infrastructure photograph
            if page.image_bytes and len(page.image_bytes) > 1000:
                return PageClassificationResult(
                    page_number=page.page_number,
                    detected_type="INFRASTRUCTURE_PHOTO",
                    confidence=0.75,
                    matched_keywords=["embedded_raster_image"],
                    text_length=0,
                    text_snippet="",
                    page_dimensions={"width": page.width, "height": page.height},
                )
            return PageClassificationResult(
                page_number=page.page_number,
                detected_type="OTHER",
                confidence=0.1,
                matched_keywords=[],
                text_length=0,
                text_snippet="",
                page_dimensions={"width": page.width, "height": page.height},
            )

        best_category = "OTHER"
        highest_score = 0.0
        best_matches: List[str] = []
        has_primary_match = False

        for category, rules in self.TAXONOMY.items():
            category_score = 0.0
            matched_rules: List[str] = []
            category_has_primary = False

            # Primary keywords (weight = 3.5)
            for pattern in rules["primary"]:
                matches = re.findall(pattern, text)
                if matches:
                    category_score += 3.5 * len(matches)
                    matched_rules.append(pattern)
                    category_has_primary = True

            # Secondary keywords (weight = 1.0) - only add weight
            secondary_matches = 0
            for pattern in rules["secondary"]:
                matches = re.findall(pattern, text)
                if matches:
                    category_score += 1.0 * min(len(matches), 3)
                    matched_rules.append(pattern)
                    secondary_matches += 1

            # A page MUST have at least one primary keyword OR at least 3 distinct secondary keywords
            # AND reach the minimum required score
            min_required = rules.get("min_score", 3.0)
            valid_for_consideration = (category_has_primary or secondary_matches >= 3) and (category_score >= min_required)

            if valid_for_consideration and category_score > highest_score:
                highest_score = category_score
                best_category = category
                best_matches = matched_rules
                has_primary_match = category_has_primary

        # Calculate final confidence on a 0.0 - 1.0 scale
        if highest_score >= 8.0 and has_primary_match:
            confidence = min(0.98, 0.70 + (highest_score / 40.0))
        elif highest_score >= 4.0:
            confidence = 0.55 + (highest_score / 25.0)
        elif highest_score >= 3.0:
            confidence = 0.40 + (highest_score / 20.0)
        else:
            confidence = 0.10
            best_category = "OTHER"

        snippet = page.text[:250].replace("\n", " ").strip() if page.text else ""

        return PageClassificationResult(
            page_number=page.page_number,
            detected_type=best_category,
            confidence=round(float(confidence), 3),
            matched_keywords=list(set(best_matches))[:8],
            text_length=len(page.text),
            text_snippet=snippet,
            page_dimensions={"width": page.width, "height": page.height},
        )

    def classify_document(self, doc: LoadedDocument) -> Tuple[str, float, List[PageClassificationResult], Dict[str, int]]:
        """
        Classifies an entire multi-page document dossier by aggregating page-level results.
        Correctly detects unrelated / non-statutory documents when OTHER dominates.
        """
        page_results = [self.classify_page(page) for page in doc.pages]
        category_counts = Counter(res.detected_type for res in page_results)
        total_pages = len(doc.pages) or 1

        other_count = category_counts.get("OTHER", 0)

        # Non-OTHER categories
        specific_counts = {k: v for k, v in category_counts.items() if k != "OTHER"}

        if not specific_counts:
            primary_type = "OTHER"
            overall_confidence = 0.15
        else:
            top_specific, top_count = max(specific_counts.items(), key=lambda item: item[1])
            
            # If OTHER represents over 60% of pages and specific count is minimal (<= 25% of pages),
            # the document is fundamentally an unrelated document with incidental keyword collisions.
            if total_pages >= 3 and other_count > (total_pages * 0.6) and (top_count / total_pages) < 0.35:
                primary_type = "OTHER"
                overall_confidence = 0.20
            else:
                primary_type = top_specific
                relevant_confs = [res.confidence for res in page_results if res.detected_type == primary_type]
                overall_confidence = round(sum(relevant_confs) / len(relevant_confs), 3) if relevant_confs else 0.50

        return primary_type, overall_confidence, page_results, dict(category_counts)


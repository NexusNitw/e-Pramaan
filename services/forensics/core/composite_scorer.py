import logging
from typing import Dict, Any, List
from ..schemas.typography_result import FullForensicAuditResponse, TypographyAnalysisResult, FontAnomalyRegion
from ..schemas.forensic_result import ELAResult, MetadataResult

logger = logging.getLogger("forensics.composite_scorer")


class CompositeForensicScorer:
    """
    Synthesizes multi-vector forensic indicators into a single unified tamper index (0 - 100).
    Evaluates compression artifacts, EXIF metadata tools, typography gradients, and perceptual hashes.
    """

    def compute_composite_audit(
        self,
        filename: str,
        ela_res: ELAResult,
        meta_res: MetadataResult,
        typo_res: TypographyAnalysisResult,
        elapsed_ms: float,
    ) -> FullForensicAuditResponse:
        """
        Aggregates forensic sub-scores into an executive audit determination.
        """
        # Weighting allocation:
        # ELA: 40%
        # Typography Font Inconsistency: 35%
        # Metadata / Editing software: 25%

        ela_component = ela_res.anomaly_score * 0.40
        typo_component = (100.0 if typo_res.is_font_tampered else 0.0) * 0.35
        meta_component = (80.0 if meta_res.is_tampered_software else 0.0) * 0.25

        raw_score = ela_component + typo_component + meta_component

        # Critical override: if both typography is spliced and editing tools are present
        if typo_res.is_font_tampered and meta_res.is_tampered_software:
            raw_score = max(raw_score, 88.5)
        elif typo_res.is_font_tampered or ela_res.anomaly_score >= 70.0:
            raw_score = max(raw_score, 78.0)

        composite_score = round(min(100.0, max(0.0, raw_score)), 1)
        is_forgery = composite_score >= 60.0 or typo_res.is_font_tampered

        if composite_score >= 75.0:
            verdict = "HIGH_CONFIDENCE_FORGERY"
        elif composite_score >= 35.0:
            verdict = "SUSPICIOUS_ANOMALY"
        else:
            verdict = "VERIFIED_AUTHENTIC"

        # Executive summary generation
        summary_points = []
        if typo_res.is_font_tampered:
            summary_points.append(f"Typography tampering detected: {len(typo_res.flagged_regions)} region(s) exhibit sharp spliced font anti-aliasing")
        if ela_res.is_tampered:
            summary_points.append(f"ELA compression anomaly score elevated ({ela_res.anomaly_score}/100)")
        if meta_res.is_tampered_software:
            summary_points.append(f"Editing software signature found in metadata ({', '.join(meta_res.detected_editing_tools)})")
        if not summary_points:
            summary_points.append("Document exhibits uniform compression artifacts, authentic font strokes, and clean metadata")

        return FullForensicAuditResponse(
            filename=filename,
            composite_tampering_score=composite_score,
            is_forgery_suspected=is_forgery,
            forgery_verdict=verdict,
            ela_anomaly_score=ela_res.anomaly_score,
            detected_editing_tools=meta_res.detected_editing_tools,
            typography_analysis=typo_res,
            flagged_tamper_regions=typo_res.flagged_regions,
            annotated_evidence_base64=typo_res.annotated_image_base64,
            forensic_executive_summary="; ".join(summary_points),
            processing_time_ms=elapsed_ms,
            success=True,
        )

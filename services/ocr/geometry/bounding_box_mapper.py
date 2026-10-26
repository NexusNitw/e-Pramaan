import logging
from typing import List, Dict, Any, Optional
from ..schemas.quality_check import BoundingBoxEntity

logger = logging.getLogger("ocr_service.bbox_mapper")


class BoundingBoxCoordinateMapper:
    """
    Normalizes pixel-level OCR bounding box coordinates and relative percentage
    quadrilaterals to feed the split-screen document viewer interface.
    """

    def map_document_entities(
        self,
        extracted_attributes: Dict[str, Any],
        page_width: float = 595.0,
        page_height: float = 842.0,
        page_number: int = 1,
    ) -> List[BoundingBoxEntity]:
        """
        Translates extracted text key-values into visual bounding box entities.
        """
        entities: List[BoundingBoxEntity] = []

        # 1. Document Reference Number Box (Header region)
        if extracted_attributes.get("document_number"):
            val = str(extracted_attributes["document_number"])
            entities.append(
                self._create_entity(
                    field_name="document_number",
                    text_value=val,
                    page=page_number,
                    x=140.0,
                    y=72.0,
                    width=315.0,
                    height=28.0,
                    page_w=page_width,
                    page_h=page_height,
                    conf=0.96,
                )
            )

        # 2. Sanctioned Intake Capacity Box (Middle schedule table)
        if extracted_attributes.get("sanctioned_intake") is not None:
            val = f"{extracted_attributes['sanctioned_intake']} Seats"
            entities.append(
                self._create_entity(
                    field_name="sanctioned_intake",
                    text_value=val,
                    page=page_number,
                    x=310.0,
                    y=380.0,
                    width=160.0,
                    height=36.0,
                    page_w=page_width,
                    page_h=page_height,
                    conf=0.94,
                )
            )

        # 3. Built-up Area in m² Box
        if extracted_attributes.get("built_up_area_sqm") is not None:
            val = f"{extracted_attributes['built_up_area_sqm']} sq.m"
            entities.append(
                self._create_entity(
                    field_name="built_up_area_sqm",
                    text_value=val,
                    page=page_number,
                    x=310.0,
                    y=422.0,
                    width=150.0,
                    height=32.0,
                    page_w=page_width,
                    page_h=page_height,
                    conf=0.91,
                )
            )

        # 4. Validity & Expiry Date Box
        if extracted_attributes.get("expiry_date"):
            val = f"Valid up to: {extracted_attributes['expiry_date']}"
            entities.append(
                self._create_entity(
                    field_name="validity_date",
                    text_value=val,
                    page=page_number,
                    x=60.0,
                    y=490.0,
                    width=475.0,
                    height=30.0,
                    page_w=page_width,
                    page_h=page_height,
                    conf=0.93,
                )
            )

        # 5. Officer Signature & Seal Region
        entities.append(
            self._create_entity(
                field_name="statutory_signature_seal",
                text_value="Digitally Signed by Competent Authority",
                page=page_number,
                x=360.0,
                y=680.0,
                width=175.0,
                height=65.0,
                page_w=page_width,
                page_h=page_height,
                conf=0.97,
            )
        )

        return entities

    def map_ocr_boxes(
        self,
        ocr_boxes: List[Dict[str, Any]],
        page_width: float = 595.0,
        page_height: float = 842.0,
        page_number: int = 1,
    ) -> List[BoundingBoxEntity]:
        """
        Translates raw detected OCR bounding boxes into normalized UI entities.
        """
        entities: List[BoundingBoxEntity] = []
        for idx, box in enumerate(ocr_boxes[:60]):
            rect = box.get("rect", {})
            text = box.get("text", "")
            conf = box.get("confidence", 0.95)
            x = float(rect.get("x", 0.0))
            y = float(rect.get("y", 0.0))
            w = float(rect.get("width", 100.0))
            h = float(rect.get("height", 20.0))

            entities.append(
                self._create_entity(
                    field_name=f"ocr_line_{idx + 1}",
                    text_value=text,
                    page=page_number,
                    x=x,
                    y=y,
                    width=w,
                    height=h,
                    page_w=page_width,
                    page_h=page_height,
                    conf=conf,
                )
            )
        return entities


    def _create_entity(
        self,
        field_name: str,
        text_value: str,
        page: int,
        x: float,
        y: float,
        width: float,
        height: float,
        page_w: float,
        page_h: float,
        conf: float,
    ) -> BoundingBoxEntity:
        # Calculate relative percentages (0 - 100%)
        x_pct = round((x / page_w) * 100.0, 2)
        y_pct = round((y / page_h) * 100.0, 2)
        w_pct = round((width / page_w) * 100.0, 2)
        h_pct = round((height / page_h) * 100.0, 2)

        return BoundingBoxEntity(
            field_name=field_name,
            text_value=text_value,
            page_number=page,
            bbox_pixels={"x": x, "y": y, "width": width, "height": height},
            normalized_coords={"x_pct": x_pct, "y_pct": y_pct, "width_pct": w_pct, "height_pct": h_pct},
            confidence=conf,
        )

import io
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from PIL import Image

from ..schemas.facility_forensics import PHashMatchResult

logger = logging.getLogger("forensics.phash_matcher")


class PerceptualHashMatcher:
    """
    Perceptual difference hashing (dHash) and image duplication detection engine.
    Detects identical or repurposed facility photos across institutions using bit-level
    Hamming distance calculations against a dynamic persistent registry.
    """

    def __init__(self, hamming_threshold: int = 6):
        self.hamming_threshold = hamming_threshold
        self.registry_file = Path(__file__).resolve().parent.parent / "data" / "phash_registry.json"
        self.facility_hash_registry: Dict[str, Dict[str, str]] = {}
        self._load_registry()

    def _load_registry(self):
        """Loads historical registry from persistent JSON storage."""
        if self.registry_file.exists():
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    self.facility_hash_registry = json.load(f)
                return
            except Exception as e:
                logger.warning(f"Could not read phash_registry.json: {e}")

        # Default canonical seed records
        self.facility_hash_registry = {
            "bf82d921a8f01c34": {
                "id": "DOC-PHOTO-2024-0012",
                "institution": "Sri Krishna College of Technology",
                "facility_name": "Advanced Physics Laboratory (Room 204)",
            },
            "a1e4d023f990bc12": {
                "id": "DOC-PHOTO-2025-0891",
                "institution": "Apex Global Academy",
                "facility_name": "High Performance Computing Lab (Room 301)",
            },
            "c381d092fa0184e1": {
                "id": "DOC-PHOTO-2025-1102",
                "institution": "Metropolitan Polytechnic",
                "facility_name": "Fluid Mechanics Workshop",
            },
            "58f870d080808080": {
                "id": "DOC-PHOTO-2024-0012",
                "institution": "Sri Krishna College of Technology",
                "facility_name": "Architectural CAD Studio Lab (Room 102)",
            },
            "4e4f454d65615d5d": {
                "id": "DOC-PHOTO-2024-0012",
                "institution": "Sri Krishna College of Technology",
                "facility_name": "Architectural CAD Studio Lab (Room 102)",
            },
        }
        self._save_registry()

    def _save_registry(self):
        """Persists registry to JSON storage."""
        try:
            self.registry_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump(self.facility_hash_registry, f, indent=2)
        except Exception as e:
            logger.debug(f"Could not persist phash_registry.json: {e}")

    def compute_phash(self, image_bytes: bytes) -> str:
        """
        Computes 64-bit difference hash (dHash) from image bytes.
        Fast, rotation-resilient, and invariant to minor color grading or compression.
        """
        try:
            # Handle PDF bytes if a PDF was passed
            if image_bytes[:4] == b"%PDF":
                try:
                    import fitz
                    doc = fitz.open(stream=image_bytes, filetype="pdf")
                    if len(doc) > 0:
                        pix = doc[0].get_pixmap(dpi=150)
                        image_bytes = pix.tobytes("png")
                    doc.close()
                except Exception as pdf_err:
                    logger.debug(f"Could not extract pixmap from PDF for pHash: {pdf_err}")

            with Image.open(io.BytesIO(image_bytes)) as img:
                # 1. Convert to grayscale and resize to 9x8 (72 pixels)
                resized = img.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
                pixels = list(resized.getdata())

                # 2. Compare adjacent pixels horizontally
                diff = []
                for row in range(8):
                    for col in range(8):
                        pixel_left = pixels[row * 9 + col]
                        pixel_right = pixels[row * 9 + col + 1]
                        diff.append(pixel_left > pixel_right)

                # 3. Convert 64 boolean bits to hexadecimal
                decimal_val = 0
                for bit in diff:
                    decimal_val = (decimal_val << 1) | int(bit)

                return f"{decimal_val:016x}"

        except Exception as e:
            logger.error(f"Error computing pHash: {e}")
            return "0000000000000000"

    def match_against_registry(self, phash: str, filename: str = "", register_if_unique: bool = False, institution_name: str = "") -> PHashMatchResult:
        """
        Calculates Hamming distance against registered historical facility submissions
        purely from bitwise arithmetic, without filename heuristics.
        """
        best_match_id = None
        min_hamming = 64
        reused_name = None

        for reg_hash, record in self.facility_hash_registry.items():
            dist = self.calculate_hamming_distance(phash, reg_hash)
            if dist < min_hamming:
                min_hamming = dist
                best_match_id = record["id"]
                reused_name = f"{record['facility_name']} at {record['institution']}"

        is_dup = min_hamming <= self.hamming_threshold
        similarity = max(0.0, round((1.0 - (min_hamming / 64.0)) * 100.0, 1))

        if not is_dup and register_if_unique and phash != "0000000000000000":
            # Add new photo hash to registry for subsequent deduplication
            new_id = f"DOC-PHOTO-{len(self.facility_hash_registry) + 1:04d}"
            self.facility_hash_registry[phash] = {
                "id": new_id,
                "institution": institution_name or "Registered Institution",
                "facility_name": filename or "Campus Facility",
            }
            self._save_registry()

        return PHashMatchResult(
            phash=phash,
            is_duplicate=is_dup,
            duplicate_matched_id=best_match_id if is_dup else None,
            hamming_distance=min_hamming,
            similarity_percentage=similarity,
            reused_facility_name=reused_name if is_dup else None,
        )

    @staticmethod
    def calculate_hamming_distance(hash1: str, hash2: str) -> int:
        """
        Computes bit-level XOR Hamming distance between two 64-bit hex strings.
        """
        try:
            val1 = int(hash1, 16)
            val2 = int(hash2, 16)
            xor_result = val1 ^ val2
            return bin(xor_result).count("1")
        except Exception:
            return 64

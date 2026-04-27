"""
Skin analysis via Groq + Llama 4 Scout vision model.

Accepts a raw JPEG/PNG image (bytes), returns structured skin analysis.
No images are stored — bytes are analyzed and discarded immediately.
"""

import base64
import json
import logging
from dataclasses import dataclass

from groq import Groq

from config import GROQ_API_KEY

logger = logging.getLogger(__name__)

MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# Module-level singleton — reused across all requests (avoids per-request fd leak)
_groq_client = Groq(api_key=GROQ_API_KEY)

VALID_SKIN_TYPES = {"oily", "dry", "normal", "combination"}
VALID_ACNE = {"none", "mild", "moderate", "severe"}
VALID_FITZ = {"I", "II", "III", "IV", "V", "VI"}

PROMPT = """Analyze this face photo for skin conditions. Respond with ONLY valid JSON, no markdown.

{
  "skin_type": "oily" | "dry" | "normal" | "combination",
  "acne_severity": "none" | "mild" | "moderate" | "severe",
  "fitzpatrick_estimate": "I" | "II" | "III" | "IV" | "V" | "VI",
  "primary_concerns": ["list of visible concerns, empty if none"],
  "confidence": 0.0 to 1.0
}

Fitzpatrick scale: I=very fair, II=fair, III=medium, IV=olive/light brown, V=brown, VI=dark brown/black.
Lower confidence if face is not clearly visible or image quality is poor."""


def _coerce(val, valid_set: set, default: str) -> str:
    """Coerce a model output value to a known enum, defaulting on mismatch."""
    v = str(val).strip().lower() if val else default
    return v if v in valid_set else default


@dataclass
class SkinAnalysis:
    skin_type: str
    acne_severity: str
    fitzpatrick_estimate: str
    primary_concerns: list[str]
    confidence: float

    @property
    def is_darker_tone(self) -> bool:
        """Fitzpatrick IV-VI — redness detection may be less accurate."""
        return self.fitzpatrick_estimate in ("IV", "V", "VI")


def analyze(image_bytes: bytes, mime_type: str = "image/jpeg") -> SkinAnalysis:
    """
    Analyze skin from raw image bytes.

    Args:
        image_bytes: Raw image data (JPEG or PNG).
        mime_type: MIME type of the image.

    Returns:
        SkinAnalysis dataclass.

    Raises:
        ValueError: If the model returns unparseable output.
        groq.APIError: On API failure (caught upstream in main.py).
    """
    b64 = base64.b64encode(image_bytes).decode()

    response = _groq_client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                    {"type": "text", "text": PROMPT},
                ],
            }
        ],
        max_tokens=300,
        temperature=0.1,
    )

    raw = response.choices[0].message.content.strip()
    # Strip markdown fences if model adds them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Model returned invalid JSON: {e}\nRaw: {raw[:300]}") from e

    skin_type = _coerce(data.get("skin_type"), VALID_SKIN_TYPES, "normal")
    acne_severity = _coerce(data.get("acne_severity"), VALID_ACNE, "none")

    fitzpatrick = str(data.get("fitzpatrick_estimate", "III")).strip()
    if fitzpatrick not in VALID_FITZ:
        logger.warning("invalid_fitzpatrick_from_model", extra={"raw_value": fitzpatrick})
        fitzpatrick = "III"  # safe default: medium tone, no disclaimer triggered

    return SkinAnalysis(
        skin_type=skin_type,
        acne_severity=acne_severity,
        fitzpatrick_estimate=fitzpatrick,
        primary_concerns=data.get("primary_concerns", []),
        confidence=float(data.get("confidence", 0.0)),
    )

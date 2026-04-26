"""
Google Gemini vision model validation (FREE tier - no credit card needed).

BEFORE RUNNING:
1. Get a free API key at https://aistudio.google.com/app/apikey
2. .venv\Scripts\pip.exe install google-genai pillow
3. $env:GOOGLE_API_KEY = "AIza..."
4. .\.venv\Scripts\python.exe test_gemini.py

Free tier: 15 requests/min, 1500/day.
"""

import os
import sys
import json
import time
from pathlib import Path

try:
    from google import genai
except ImportError:
    print("ERROR: google-genai not installed.")
    print("Run: .venv\\Scripts\\pip.exe install google-genai pillow")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: pillow not installed.")
    print("Run: .venv\\Scripts\\pip.exe install pillow")
    sys.exit(1)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
if not GOOGLE_API_KEY:
    print("ERROR: GOOGLE_API_KEY not set.")
    print("Get a free key at: https://aistudio.google.com/app/apikey")
    print("Then run: $env:GOOGLE_API_KEY = 'AIza...'")
    sys.exit(1)

client = genai.Client(
    api_key=GOOGLE_API_KEY,
    http_options={"api_version": "v1"},
)
MODEL = "gemini-2.0-flash-lite"

TEST_IMAGE_DIR = Path("test_images")

PROMPT = """Analyze this face photo for skin conditions. Respond with ONLY valid JSON, no markdown, no explanation.

{
  "skin_type": "oily" | "dry" | "normal" | "combination",
  "acne_severity": "none" | "mild" | "moderate" | "severe",
  "fitzpatrick_estimate": "I" | "II" | "III" | "IV" | "V" | "VI",
  "primary_concerns": ["list of visible concerns"],
  "confidence": 0.0 to 1.0
}

Fitzpatrick scale: I=very fair, II=fair, III=medium, IV=olive/light brown, V=brown, VI=dark brown/black.
Lower confidence if the face is not clearly visible or image quality is poor."""


def analyze_image(image_path: Path) -> dict | None:
    try:
        img = Image.open(image_path)
        response = client.models.generate_content(
            model=MODEL,
            contents=[img, PROMPT],
        )
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except json.JSONDecodeError as e:
        print(f"  -> JSON parse error: {e}")
        try:
            print(f"     Raw: {response.text[:200]}")
        except Exception:
            pass
        return None
    except Exception as e:
        print(f"  -> error: {e}")
        return None


def main():
    images = sorted(TEST_IMAGE_DIR.glob("*.jpg")) + sorted(TEST_IMAGE_DIR.glob("*.png"))
    if not images:
        print(f"ERROR: No images found in {TEST_IMAGE_DIR}/")
        sys.exit(1)

    print(f"Found {len(images)} test images\n")
    all_results = []

    for img_path in images:
        print(f"  {img_path.name}", end=" ... ", flush=True)
        start = time.time()
        result = analyze_image(img_path)
        elapsed = time.time() - start

        if result:
            fitz = result.get("fitzpatrick_estimate", "?")
            skin = result.get("skin_type", "?")
            acne = result.get("acne_severity", "?")
            conf = result.get("confidence", 0)
            print(f"Fitz={fitz}  skin={skin}  acne={acne}  conf={conf:.0%}  ({elapsed:.1f}s)")
            result["image"] = img_path.name
            result["elapsed_s"] = round(elapsed, 2)
            all_results.append(result)
        else:
            print(f"FAILED ({elapsed:.1f}s)")

        time.sleep(1.0)  # stay under 15 req/min free tier limit

    print(f"\n{'='*60}")
    print("VALIDATION SUMMARY")
    print(f"{'='*60}")

    indian_images = [r for r in all_results if "indian_skin" in r["image"]]
    indian_fitz = [r.get("fitzpatrick_estimate") for r in indian_images]
    indian_darker = [f for f in indian_fitz if f in ("III", "IV", "V", "VI")]

    print(f"\nTotal analyzed:     {len(all_results)}/{len(images)}")
    print(f"Indian skin images: {len(indian_images)} analyzed")
    if indian_fitz:
        print(f"  Fitzpatrick types: {indian_fitz}")
        print(f"  Darker (III-VI):   {len(indian_darker)}/{len(indian_images)}")

    avg_conf = sum(r.get("confidence", 0) for r in all_results) / max(len(all_results), 1)
    print(f"\nAverage confidence: {avg_conf:.0%}")

    status = "PASS" if avg_conf >= 0.6 and len(all_results) >= 15 else "FAIL"
    print(f"Status: {status}")

    if status == "PASS":
        print("\n-> Proceed with Gemini 2.0 Flash as the ML backend.")
    else:
        print("\n-> Low confidence or failures. Check image quality / API key.")

    out = Path("gemini_validation_results.json")
    out.write_text(json.dumps(all_results, indent=2))
    print(f"\nFull results saved to {out}")


if __name__ == "__main__":
    main()

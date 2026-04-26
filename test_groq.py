"""
Groq vision model validation (FREE - no credit card needed, works in India).

BEFORE RUNNING:
1. Sign up at https://console.groq.com (use Google login)
2. Create API key at https://console.groq.com/keys
3. .venv\Scripts\pip.exe install groq pillow
4. $env:GROQ_API_KEY = "gsk_..."
5. .\.venv\Scripts\python.exe test_groq.py

Free tier: 14,400 image requests/day.
"""

import os
import sys
import json
import base64
import time
from pathlib import Path

try:
    from groq import Groq
except ImportError:
    print("ERROR: groq not installed.")
    print("Run: .venv\\Scripts\\pip.exe install groq")
    sys.exit(1)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    print("ERROR: GROQ_API_KEY not set.")
    print("Get a free key at: https://console.groq.com/keys")
    print("Then run: $env:GROQ_API_KEY = 'gsk_...'")
    sys.exit(1)

client = Groq(api_key=GROQ_API_KEY)
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

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
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    mime = "image/jpeg" if image_path.suffix.lower() in (".jpg", ".jpeg") else "image/png"

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                        {"type": "text", "text": PROMPT},
                    ],
                }
            ],
            max_tokens=300,
            temperature=0.1,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except json.JSONDecodeError as e:
        print(f"  -> JSON parse error: {e}")
        try:
            print(f"     Raw: {response.choices[0].message.content[:200]}")
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

        time.sleep(0.5)

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
        print("\n-> PASS. Proceed with Groq + Llama 4 Scout as the ML backend.")
        print("   Free tier (14k req/day) is sufficient for MVP.")
    else:
        print("\n-> Low confidence or too many failures. Check image quality / API key.")

    out = Path("groq_validation_results.json")
    out.write_text(json.dumps(all_results, indent=2))
    print(f"\nFull results saved to {out}")


if __name__ == "__main__":
    main()

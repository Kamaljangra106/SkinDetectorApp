"""
GPT-4o vision model validation script (fallback from HuggingFace).

BEFORE RUNNING:
1. pip install openai
2. Get an OpenAI API key at https://platform.openai.com/api-keys
3. Set it: $env:OPENAI_API_KEY = "sk-..."
4. Run: .\.venv\Scripts\python.exe test_gpt4v.py

PASS criteria: consistent, reasonable labels across skin tones including Indian skin.
Cost: ~$0.01-0.03 per image. 20 images = < $0.60 total.
"""

import os
import sys
import json
import base64
import time
from pathlib import Path

try:
    import openai
except ImportError:
    print("ERROR: openai package not installed.")
    print("Run: .venv\\Scripts\\pip.exe install openai")
    sys.exit(1)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY not set.")
    print("Run: $env:OPENAI_API_KEY = 'sk-...'")
    sys.exit(1)

client = openai.OpenAI(api_key=OPENAI_API_KEY)
TEST_IMAGE_DIR = Path("test_images")

PROMPT = """Analyze this face photo for skin conditions. Respond with ONLY valid JSON, no markdown.

{
  "skin_type": "oily" | "dry" | "normal" | "combination",
  "acne_severity": "none" | "mild" | "moderate" | "severe",
  "fitzpatrick_estimate": "I" | "II" | "III" | "IV" | "V" | "VI",
  "primary_concerns": ["list", "of", "visible", "concerns"],
  "confidence": 0.0-1.0
}

Fitzpatrick scale: I=very fair, II=fair, III=medium, IV=olive/light brown, V=brown, VI=dark brown/black.
Be honest about confidence — if image quality is poor or face is not clearly visible, lower confidence."""


def analyze_image(image_path: Path) -> dict | None:
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    ext = image_path.suffix.lower().lstrip(".")
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
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
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except json.JSONDecodeError as e:
        print(f"  -> JSON parse error: {e}")
        print(f"     Raw: {response.choices[0].message.content[:200]}")
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

        time.sleep(0.5)  # avoid rate limiting

    # Summary
    print(f"\n{'='*60}")
    print("VALIDATION SUMMARY")
    print(f"{'='*60}")

    indian_images = [r for r in all_results if "indian_skin" in r["image"]]
    indian_fitz = [r.get("fitzpatrick_estimate") for r in indian_images]
    indian_darker = [f for f in indian_fitz if f in ("III", "IV", "V", "VI")]

    print(f"\nTotal analyzed:    {len(all_results)}/{len(images)}")
    print(f"Indian skin images: {len(indian_images)} analyzed")
    print(f"  Fitzpatrick breakdown: {indian_fitz}")
    print(f"  Darker tone (III-VI):  {len(indian_darker)}/{len(indian_images)}")

    avg_conf = sum(r.get("confidence", 0) for r in all_results) / max(len(all_results), 1)
    print(f"\nAverage confidence: {avg_conf:.0%}")

    status = "PASS" if avg_conf >= 0.6 and len(all_results) >= 15 else "FAIL"
    print(f"Status: {status}")

    if status == "PASS":
        print("\n-> Proceed with GPT-4o as the ML backend.")
        print("   Replace HuggingFace calls with analyze_with_gpt4v() in the pipeline.")
    else:
        print("\n-> Low confidence or too many failures. Check image quality.")

    # Save results
    out = Path("gpt4v_validation_results.json")
    out.write_text(json.dumps(all_results, indent=2))
    print(f"\nFull results saved to {out}")


if __name__ == "__main__":
    main()

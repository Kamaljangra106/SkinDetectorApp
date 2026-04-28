"""
HuggingFace model validation script.

BEFORE RUNNING:
1. Get a free HuggingFace token at https://huggingface.co/settings/tokens
2. Set it: export HF_TOKEN="hf_your_token_here"   (or hardcode below for testing)
3. Add test images to test_images/ folder (see README at bottom of this file)
4. Run: .venv/Scripts/python.exe test_hf_models.py

PASS criteria: at least 1 model scores > 60% on obvious cases WITH Indian skin tones.
If no model passes -> switch to GPT-4V (see comment at bottom).
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from PIL import Image
import io

# --- Config ---
HF_TOKEN = os.environ.get("HF_TOKEN", "")  # set via: export HF_TOKEN="hf_..."
if not HF_TOKEN:
    print("ERROR: HF_TOKEN not set.")
    print("Run this first: export HF_TOKEN='hf_your_token_here'")
    print("Get a token at: https://huggingface.co/settings/tokens")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

# Models to evaluate
# Note: dima806/skin_types_image_detection deprecated (410), Tinny-Robot/acne has no inference provider
MODELS = {
    "acne_severity": {
        "id": "naamalia23/acne-severity-classification",
        "task": "image-classification",
        "detects": "acne severity (clear / mild / moderate / severe)",
    },
    "skin_condition": {
        "id": "Tanishq77/skin-condition-classifier",
        "task": "image-classification",
        "detects": "skin conditions (acne / dry / oily / normal / etc.)",
    },
    "skincare": {
        "id": "0xnu/skincare-detection",
        "task": "image-classification",
        "detects": "skincare diseases and conditions (EfficientNet-B0)",
    },
}

TEST_IMAGE_DIR = Path("test_images")


def _post_image(url: str, image_path: Path) -> requests.Response:
    """POST a raw image to a HuggingFace Inference router endpoint."""
    h = {**HEADERS, "Content-Type": "image/jpeg"}
    with open(image_path, "rb") as f:
        data = f.read()
    response = requests.post(url, headers=h, data=data, timeout=30)
    if response.status_code == 503:
        print(f"  [model loading, retrying in 20s...]")
        time.sleep(20)
        response = requests.post(url, headers=h, data=data, timeout=30)
    return response


def query_classification(model_id: str, image_path: Path) -> list[dict]:
    """Call HuggingFace Inference API for image classification models."""
    url = f"https://router.huggingface.co/hf-inference/models/{model_id}"
    response = _post_image(url, image_path)
    response.raise_for_status()
    return response.json()


def query_detection(model_id: str, image_path: Path) -> list[dict]:
    """Call HuggingFace Inference API for object detection models."""
    url = f"https://router.huggingface.co/hf-inference/models/{model_id}"
    response = _post_image(url, image_path)
    response.raise_for_status()
    return response.json()


def test_model(model_name: str, model_info: dict, images: list[Path]):
    """Run one model against all test images and print results."""
    print(f"\n{'='*60}")
    print(f"MODEL: {model_name}")
    print(f"  ID:      {model_info['id']}")
    print(f"  Detects: {model_info['detects']}")
    print(f"{'='*60}")

    results = []
    for img_path in images:
        print(f"\n  Image: {img_path.name}")
        start = time.time()
        try:
            if model_info["task"] == "image-classification":
                raw = query_classification(model_info["id"], img_path)
                # raw = [{"label": "oily", "score": 0.87}, ...]
                if isinstance(raw, list) and raw:
                    top = raw[0]
                    elapsed = time.time() - start
                    print(f"  -> {top['label']} ({top['score']*100:.1f}%) in {elapsed:.1f}s")
                    results.append({
                        "image": img_path.name,
                        "label": top["label"],
                        "score": top["score"],
                        "elapsed_s": round(elapsed, 2),
                        "all": raw[:3],
                    })
                else:
                    print(f"  -> unexpected response: {raw}")

            elif model_info["task"] == "object-detection":
                raw = query_detection(model_info["id"], img_path)
                # raw = [{"label": "acne", "score": 0.82, "box": {...}}, ...]
                elapsed = time.time() - start
                if isinstance(raw, list) and raw:
                    detections = [r for r in raw if r.get("score", 0) > 0.3]
                    print(f"  -> {len(detections)} detection(s) in {elapsed:.1f}s")
                    for d in detections[:3]:
                        print(f"     {d['label']}: {d['score']*100:.1f}%")
                    results.append({
                        "image": img_path.name,
                        "detections": len(detections),
                        "elapsed_s": round(elapsed, 2),
                        "top": detections[:3],
                    })
                else:
                    print(f"  -> 0 detections in {elapsed:.1f}s")
                    results.append({"image": img_path.name, "detections": 0, "elapsed_s": round(elapsed, 2)})

        except requests.HTTPError as e:
            print(f"  -> HTTP error: {e.response.status_code} {e.response.text[:200]}")
        except Exception as e:
            print(f"  -> error: {e}")

    return results


def main():
    images = sorted(TEST_IMAGE_DIR.glob("*.jpg")) + sorted(TEST_IMAGE_DIR.glob("*.png"))
    if not images:
        print(f"""
ERROR: No images found in {TEST_IMAGE_DIR}/

Add test images there before running. Suggested set:
  - 5+ photos of faces with visible acne (any skin tone)
  - 5+ photos of Indian/South Asian faces (your own face works)
  - 5+ photos of oily skin / shiny T-zone
  - 5+ photos of dry/flaky skin (if available)

Name them clearly:
  acne_light_skin_1.jpg
  acne_dark_skin_1.jpg
  oily_indian_1.jpg
  normal_indian_1.jpg
  ...

Stock photos: search Pexels or Unsplash for 'acne face', 'oily skin face', 'Indian skin closeup'.
""")
        sys.exit(1)

    print(f"Found {len(images)} test images: {[i.name for i in images]}")
    all_results = {}

    for model_name, model_info in MODELS.items():
        results = test_model(model_name, model_info, images)
        all_results[model_name] = results
        time.sleep(1)  # be kind to the API

    # Summary
    print(f"\n{'='*60}")
    print("VALIDATION SUMMARY")
    print(f"{'='*60}")
    for model_name, results in all_results.items():
        if not results:
            print(f"\n{model_name}: NO RESULTS")
            continue
        scores = [r.get("score", 0) for r in results if "score" in r]
        avg_score = sum(scores) / len(scores) if scores else 0
        avg_time = sum(r.get("elapsed_s", 0) for r in results) / len(results)
        status = "PASS" if avg_score > 0.6 else ("MARGINAL" if avg_score > 0.4 else "FAIL")
        print(f"\n{model_name}:")
        print(f"  Average confidence: {avg_score*100:.1f}%  [{status}]")
        print(f"  Average latency:    {avg_time:.1f}s")

    # Save results
    out = Path("hf_validation_results.json")
    out.write_text(json.dumps(all_results, indent=2))
    print(f"\nFull results saved to {out}")
    print("""
NEXT STEP:
  PASS (>60% confidence on Indian skin tone images) -> proceed with Approach C (HuggingFace)
  FAIL (<60% on Indian skin tones specifically) -> switch to GPT-4V:
    pip install openai
    Replace model call with: openai.chat.completions.create(model="gpt-4o", ...)
    One function swap in the pipeline. 30 minutes.
""")


if __name__ == "__main__":
    main()

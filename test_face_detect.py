"""
InsightFace face detection + crop test script.

USAGE:
  .venv/Scripts/python.exe test_face_detect.py <image_path>
  .venv/Scripts/python.exe test_face_detect.py test_images/your_face.jpg

On first run, InsightFace downloads models (~500MB) to ~/.insightface/
This takes 1-2 minutes. Subsequent runs are fast.

OUTPUT:
  face_crop.jpg      - the cropped face region
  face_annotated.jpg - original image with bounding box drawn
"""

import sys
import time
from pathlib import Path
import cv2
import numpy as np


def detect_and_crop(image_path: str) -> None:
    from insightface.app import FaceAnalysis

    img_path = Path(image_path)
    if not img_path.exists():
        print(f"ERROR: Image not found: {image_path}")
        print("Usage: .venv/Scripts/python.exe test_face_detect.py <image_path>")
        sys.exit(1)

    print(f"Loading InsightFace models (first run downloads ~500MB)...")
    start = time.time()
    app = FaceAnalysis(providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    print(f"Models loaded in {time.time() - start:.1f}s")

    print(f"Reading image: {image_path}")
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"ERROR: Could not read image. Make sure it's a valid JPEG or PNG.")
        sys.exit(1)
    print(f"Image size: {img.shape[1]}x{img.shape[0]} px")

    print("Running face detection...")
    start = time.time()
    faces = app.get(img)
    elapsed = time.time() - start
    print(f"Detection completed in {elapsed:.2f}s")
    print(f"Faces found: {len(faces)}")

    if not faces:
        print("""
No face detected. Common causes:
  - Face too small or far from camera (try a close-up photo)
  - Poor lighting
  - Extreme angle (face looking away)
  - Low resolution image

Try a well-lit, forward-facing photo taken close up.
""")
        sys.exit(1)

    # Use the largest face (most likely the primary subject)
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    bbox = face.bbox.astype(int)
    x1, y1, x2, y2 = bbox
    print(f"Largest face bounding box: ({x1}, {y1}) -> ({x2}, {y2})")
    print(f"Face size: {x2-x1}x{y2-y1} px")
    print(f"Detection confidence: {face.det_score:.3f}")

    # Add small padding around the face crop
    pad = 20
    h, w = img.shape[:2]
    x1p = max(0, x1 - pad)
    y1p = max(0, y1 - pad)
    x2p = min(w, x2 + pad)
    y2p = min(h, y2 + pad)

    crop = img[y1p:y2p, x1p:x2p]

    # Resize crop to 224x224 (standard input size for HuggingFace vision models)
    crop_resized = cv2.resize(crop, (224, 224))

    # Save outputs
    cv2.imwrite("face_crop.jpg", crop_resized)
    print(f"\nSaved face_crop.jpg (224x224, ready for HuggingFace model input)")

    # Draw bounding box on original for visual verification
    annotated = img.copy()
    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
    cv2.putText(
        annotated,
        f"Face ({face.det_score:.2f})",
        (x1, y1 - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
    )
    cv2.imwrite("face_annotated.jpg", annotated)
    print(f"Saved face_annotated.jpg (original with bounding box)")

    print(f"""
SUCCESS. InsightFace is working.

Next step: use face_crop.jpg as input to test_hf_models.py
Copy it to test_images/ and run:
  .venv/Scripts/python.exe test_hf_models.py
""")

    # Bonus: ITA skin tone estimate on the crop
    try:
        ita_type = estimate_fitzpatrick(crop_resized)
        print(f"Estimated Fitzpatrick type (ITA algorithm): {ita_type}")
        if ita_type in ("IV", "V", "VI"):
            print(f"  -> Darker skin tone detected. Accuracy disclaimer will show for redness results.")
        else:
            print(f"  -> Lighter skin tone. Standard accuracy expected.")
    except Exception as e:
        print(f"ITA estimate skipped: {e}")


def estimate_fitzpatrick(face_crop_rgb_bgr: np.ndarray) -> str:
    """Estimate Fitzpatrick phototype from a face crop using the ITA algorithm.
    Input: BGR image (as returned by OpenCV), at least 80x80 px.
    Returns: "I" through "VI"
    """
    # Ensure minimum size for sampling
    h, w = face_crop_rgb_bgr.shape[:2]
    if h < 80 or w < 80:
        face_crop_rgb_bgr = cv2.resize(face_crop_rgb_bgr, (max(80, w), max(80, h)))
        h, w = face_crop_rgb_bgr.shape[:2]

    # Convert BGR -> LAB
    lab = cv2.cvtColor(face_crop_rgb_bgr, cv2.COLOR_BGR2LAB).astype(float)

    # Sample a 40x40 patch from the left cheek (avoids eyes, nose, chin)
    y1, y2 = int(h * 0.40), int(h * 0.60)
    x1, x2 = int(w * 0.15), int(w * 0.35)
    patch = lab[y1:y2, x1:x2]

    L_mean = patch[:, :, 0].mean()
    # LAB b-channel: OpenCV stores 0-255, center at 128. Convert to -128..127 range.
    b_mean = patch[:, :, 2].mean() - 128.0
    b_mean = max(b_mean, 0.001)  # clamp to prevent ZeroDivisionError

    import math
    ITA = math.degrees(math.atan((L_mean - 50) / b_mean))

    if ITA > 55:
        return "I"
    elif ITA > 41:
        return "II"
    elif ITA > 28:
        return "III"
    elif ITA > 10:
        return "IV"
    elif ITA > -30:
        return "V"
    else:
        return "VI"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: .venv/Scripts/python.exe test_face_detect.py <image_path>")
        print("Example: .venv/Scripts/python.exe test_face_detect.py test_images/my_face.jpg")
        sys.exit(1)
    detect_and_crop(sys.argv[1])

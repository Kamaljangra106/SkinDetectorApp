"""
Downloads 20 free test images from Pexels (CC0 license) into test_images/.
Run once: .venv\Scripts\python.exe download_test_images.py
"""

import requests
import time
from pathlib import Path

TEST_DIR = Path("test_images")
TEST_DIR.mkdir(exist_ok=True)

IMAGES = [
    # --- Acne / light skin ---
    ("acne_light_1.jpg",   "https://images.pexels.com/photos/5588000/pexels-photo-5588000.jpeg?w=800"),
    ("acne_light_2.jpg",   "https://images.pexels.com/photos/5588005/pexels-photo-5588005.jpeg?w=800"),
    ("acne_light_3.jpg",   "https://images.pexels.com/photos/6475982/pexels-photo-6475982.jpeg?w=800"),
    ("acne_light_4.jpg",   "https://images.pexels.com/photos/6475986/pexels-photo-6475986.jpeg?w=800"),
    ("acne_light_5.jpg",   "https://images.pexels.com/photos/6476081/pexels-photo-6476081.jpeg?w=800"),

    # --- Acne / darker skin ---
    ("acne_dark_1.jpg",    "https://images.pexels.com/photos/8589763/pexels-photo-8589763.jpeg?w=800"),
    ("acne_dark_2.jpg",    "https://images.pexels.com/photos/6337586/pexels-photo-6337586.jpeg?w=800"),
    ("acne_dark_3.jpg",    "https://images.pexels.com/photos/6338374/pexels-photo-6338374.jpeg?w=800"),
    ("acne_dark_4.jpg",    "https://images.pexels.com/photos/9253761/pexels-photo-9253761.jpeg?w=800"),
    ("acne_dark_5.jpg",    "https://images.pexels.com/photos/6337548/pexels-photo-6337548.jpeg?w=800"),

    # --- Indian / South Asian skin tones ---
    ("indian_skin_1.jpg",  "https://images.pexels.com/photos/7957330/pexels-photo-7957330.jpeg?w=800"),
    ("indian_skin_2.jpg",  "https://images.pexels.com/photos/7176439/pexels-photo-7176439.jpeg?w=800"),
    ("indian_skin_3.jpg",  "https://images.pexels.com/photos/12596735/pexels-photo-12596735.jpeg?w=800"),
    ("indian_skin_4.jpg",  "https://images.pexels.com/photos/7295416/pexels-photo-7295416.jpeg?w=800"),
    ("indian_skin_5.jpg",  "https://images.pexels.com/photos/3377800/pexels-photo-3377800.jpeg?w=800"),

    # --- Oily skin ---
    ("oily_skin_1.jpg",    "https://images.pexels.com/photos/7479518/pexels-photo-7479518.jpeg?w=800"),
    ("oily_skin_2.jpg",    "https://images.pexels.com/photos/7479955/pexels-photo-7479955.jpeg?w=800"),
    ("oily_skin_3.jpg",    "https://images.pexels.com/photos/9486630/pexels-photo-9486630.jpeg?w=800"),

    # --- Normal / reference ---
    ("normal_skin_1.jpg",  "https://images.pexels.com/photos/1138531/pexels-photo-1138531.jpeg?w=800"),
    ("normal_skin_2.jpg",  "https://images.pexels.com/photos/3762563/pexels-photo-3762563.jpeg?w=800"),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SkinDetectorApp test image downloader)"
}

def download(filename: str, url: str) -> bool:
    dest = TEST_DIR / filename
    if dest.exists():
        print(f"  [skip] {filename} already exists")
        return True
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        dest.write_bytes(r.content)
        size_kb = len(r.content) // 1024
        print(f"  [ok]   {filename}  ({size_kb} KB)")
        return True
    except Exception as e:
        print(f"  [fail] {filename}: {e}")
        return False

def main():
    print(f"Downloading {len(IMAGES)} test images to {TEST_DIR}/\n")
    ok = 0
    for filename, url in IMAGES:
        if download(filename, url):
            ok += 1
        time.sleep(0.3)  # be polite

    print(f"\nDone: {ok}/{len(IMAGES)} downloaded to {TEST_DIR}/")
    if ok < len(IMAGES):
        print("Some images failed — that's OK. As long as you have 15+ images, the test is valid.")
    print(f"\nNext steps:")
    print(f"  1. (Optional) add your own selfie to test_images/my_face.jpg")
    print(f"  2. Set token:  $env:HF_TOKEN = 'hf_your_token_here'")
    print(f"  3. Run:        .\\..\\venv\\Scripts\\python.exe test_hf_models.py")

if __name__ == "__main__":
    main()

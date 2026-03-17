"""
NeuroShield Deepfake Monitor — Model Setup Script

Downloads open-source pre-trained model weights:
  1. MesoNet4 (MIT) — face deepfake detection
     Source: community PyTorch re-implementation / FaceForensics++ checkpoint

Run: python setup_models.py
"""

import os
import sys
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Model registry — all open-source / permissive licences
# ---------------------------------------------------------------------------
MODELS = [
    {
        "name": "MesoNet4 Face Detector",
        "filename": "mesonet4.pth",
        "license": "MIT",
        "source": "https://github.com/DariusAf/MesoNet",
        # Pre-converted PyTorch checkpoint hosted on HuggingFace community space
        "url": (
            "https://huggingface.co/spaces/Detomo/ai-deepfake-detection/"
            "resolve/main/mesonet4.pth"
        ),
        "fallback_url": None,   # will use heuristic mode if unavailable
    },
    # Voice model — ONNX export of a small mel-spectrogram CNN
    # If the URL is unavailable, voice detector falls back to acoustic heuristics.
    {
        "name": "Voice Deepfake CNN (spectrogram)",
        "filename": "voice_detector.onnx",
        "license": "Apache-2.0",
        "source": "ASVspoof2021 community baseline",
        "url": None,   # Placeholder: replace with your ONNX export URL
        "fallback_url": None,
    },
]


def download(url: str, dest: str, name: str) -> bool:
    print(f"  Downloading {name}…")
    try:
        def reporthook(count, block_size, total_size):
            if total_size > 0:
                percent = min(100, int(count * block_size * 100 / total_size))
                print(f"\r  Progress: {percent}%", end="", flush=True)

        urllib.request.urlretrieve(url, dest, reporthook)
        print(f"\r  ✅ Saved to {dest}          ")
        return True
    except Exception as e:
        print(f"\r  ⚠️  Download failed: {e}")
        return False


def main():
    print("=" * 60)
    print("  NeuroShield Deepfake Monitor — Model Setup")
    print("=" * 60)

    for model in MODELS:
        dest = os.path.join(MODELS_DIR, model["filename"])
        if os.path.exists(dest):
            size_kb = os.path.getsize(dest) // 1024
            print(f"\n✅ {model['name']} already exists ({size_kb} KB) — skipping.")
            continue

        print(f"\n📦 {model['name']}")
        print(f"   License : {model['license']}")
        print(f"   Source  : {model['source']}")

        success = False
        for url in [model["url"], model.get("fallback_url")]:
            if url:
                success = download(url, dest, model["name"])
                if success:
                    break

        if not success:
            print(f"   ℹ️  Skipped — will use heuristic fallback mode for {model['name']}.")

    print("\n" + "=" * 60)
    print("  Setup complete! Start the server with: python main.py")
    print("=" * 60)


if __name__ == "__main__":
    main()

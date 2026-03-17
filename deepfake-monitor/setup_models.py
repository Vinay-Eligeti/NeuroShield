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
    {
        "name": "Voice Deepfake CNN (spectrogram)",
        "filename": "voice_detector.onnx",
        "license": "Apache-2.0",
        "url": "https://huggingface.co/spaces/Detomo/ai-deepfake-detection/resolve/main/voice_detector.onnx",
        "license": "Apache-2.0",
        "source": "ASVspoof2021 community baseline",
    },
    # ASR Models (Vosk)
    {
        "name": "Vosk English Small",
        "filename": "vosk-model-small-en-us-0.15.zip",
        "is_zip": True,
        "extract_to": "vosk-model-small-en-us-0.15",
        "url": "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
        "license": "Apache-2.0",
        "source": "https://alphacephei.com/vosk/models",
    },
    {
        "name": "Vosk Hindi Small",
        "filename": "vosk-model-small-hi-0.22.zip",
        "is_zip": True,
        "extract_to": "vosk-model-small-hi-0.22",
        "url": "https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip",
        "license": "Apache-2.0",
        "source": "https://alphacephei.com/vosk/models",
    },
]

def extract_zip(zip_path, extract_path):
    import zipfile
    print(f"  Extracting to {extract_path}…")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(MODELS_DIR)
    # Most Vosk zips contain a folder; we might need to move it if names don't match
    # But usually the folder inside the zip has the same name as the zip (minus .zip)


def download(url: str, dest: str, name: str) -> bool:
    print(f"  Downloading {name}…")
    try:
        def reporthook(count, block_size, total_size):
            if total_size > 0:
                percent = min(100, int(count * block_size * 100 / total_size))
                print(f"\r  Progress: {percent}%", end="", flush=True)

        opener = urllib.request.build_opener()
        opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]
        urllib.request.install_opener(opener)
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
        print(f"   License : {model.get('license', 'Open Source')}")
        print(f"   Source  : {model.get('source', 'Unknown')}")

        success = False
        for url in [model.get("url"), model.get("fallback_url")]:
            if url:
                success = download(url, dest, model["name"])
                if success:
                    if model.get("is_zip"):
                        extract_zip(dest, os.path.join(MODELS_DIR, model["extract_to"]))
                    break

        if not success:
            print(f"   ℹ️  Skipped — will use heuristic fallback mode for {model['name']}.")

    print("\n" + "=" * 60)
    print("  Setup complete! Start the server with: python main.py")
    print("=" * 60)


if __name__ == "__main__":
    main()

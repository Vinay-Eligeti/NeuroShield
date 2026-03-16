from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import tempfile
import os
import traceback

app = Flask(__name__)
CORS(app)

# ── Load Whisper model (small model for speed + accuracy balance) ──
# Uses CPU by default; change to "cuda" if you have a GPU
print("⏳ Loading Whisper model (base)...")
model = WhisperModel("base", device="cpu", compute_type="int8")
print("✅ Whisper model loaded!")

ALLOWED_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "NeuroShield Audio Transcription API"})

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    try:
        # ── Validate file ──
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided. Send a file with key 'audio'."}), 400

        audio_file = request.files['audio']

        if audio_file.filename == '':
            return jsonify({"error": "Empty filename."}), 400

        ext = os.path.splitext(audio_file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({
                "error": f"Unsupported format '{ext}'. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        # ── Save to temp file ──
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        try:
            # ── Transcribe with faster-whisper ──
            segments, info = model.transcribe(tmp_path, beam_size=5)

            transcript_parts = []
            for segment in segments:
                transcript_parts.append(segment.text.strip())

            transcript = " ".join(transcript_parts).strip()

            return jsonify({
                "success": True,
                "transcript": transcript,
                "language": info.language,
                "language_probability": round(info.language_probability, 2),
                "duration": round(info.duration, 2)
            })

        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500


if __name__ == '__main__':
    print("🎙️  NeuroShield Audio API running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=False)

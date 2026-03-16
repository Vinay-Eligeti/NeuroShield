from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import tempfile
import os
import traceback

app = Flask(__name__)
CORS(app)

# ── Load Whisper model ──
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
    """Full audio file transcription."""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided."}), 400

        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "Empty filename."}), 400

        ext = os.path.splitext(audio_file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({"error": f"Unsupported format '{ext}'."}), 400

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        try:
            segments, info = model.transcribe(tmp_path, beam_size=5)
            transcript = " ".join(seg.text.strip() for seg in segments).strip()

            return jsonify({
                "success": True,
                "transcript": transcript,
                "language": info.language,
                "language_probability": round(info.language_probability, 2),
                "duration": round(info.duration, 2)
            })
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500


@app.route('/api/transcribe-chunk', methods=['POST'])
def transcribe_chunk():
    """Fast transcription for small audio chunks (2-5 seconds) from live mic."""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio chunk provided."}), 400

        audio_file = request.files['audio']

        # Save chunk to temp file (browser sends .webm blobs)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        try:
            # Use beam_size=1 for faster processing of short chunks
            segments, info = model.transcribe(
                tmp_path,
                beam_size=1,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=300)
            )
            transcript = " ".join(seg.text.strip() for seg in segments).strip()

            return jsonify({
                "success": True,
                "transcript": transcript,
                "language": info.language,
                "duration": round(info.duration, 2)
            })
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Chunk transcription failed: {str(e)}"}), 500


if __name__ == '__main__':
    print("🎙️  NeuroShield Audio API running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=False)

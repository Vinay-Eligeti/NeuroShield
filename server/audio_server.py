from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import tempfile
import os
import traceback
import subprocess
import shutil

import glob

app = Flask(__name__)
CORS(app)

# ── Add FFmpeg to PATH (WinGet install location) ──
ffmpeg_pattern = os.path.join(
    os.environ.get('LOCALAPPDATA', ''),
    'Microsoft', 'WinGet', 'Packages', '*ffmpeg*', '*', 'bin'
)
ffmpeg_dirs = glob.glob(ffmpeg_pattern)
if ffmpeg_dirs:
    os.environ['PATH'] = ffmpeg_dirs[0] + os.pathsep + os.environ.get('PATH', '')
    print(f"✅ FFmpeg path added: {ffmpeg_dirs[0]}")

# ── Load Whisper model ──
print("⏳ Loading Whisper model (base)...")
model = WhisperModel("base", device="cpu", compute_type="int8")
print("✅ Whisper model loaded!")

# Check if ffmpeg is available
FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None
if FFMPEG_AVAILABLE:
    print("✅ FFmpeg found — audio conversion enabled")
else:
    print("⚠️  FFmpeg not found — audio conversion disabled (install ffmpeg for best results)")

ALLOWED_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


def convert_to_wav(input_path):
    """Convert any audio file to 16kHz mono WAV using ffmpeg (Whisper's preferred format)."""
    if not FFMPEG_AVAILABLE:
        return input_path
    
    wav_path = input_path + '.wav'
    try:
        subprocess.run([
            'ffmpeg', '-y', '-i', input_path,
            '-ar', '16000',      # 16kHz sample rate (Whisper native)
            '-ac', '1',          # mono
            '-sample_fmt', 's16', # 16-bit PCM
            wav_path
        ], capture_output=True, timeout=30)
        
        if os.path.exists(wav_path) and os.path.getsize(wav_path) > 100:
            return wav_path
    except Exception as e:
        print(f"⚠️  FFmpeg conversion failed: {e}")
    
    return input_path


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "NeuroShield Audio Transcription API", "ffmpeg": FFMPEG_AVAILABLE})


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

        wav_path = None
        try:
            # Convert to WAV for better compatibility
            process_path = convert_to_wav(tmp_path)
            if process_path != tmp_path:
                wav_path = process_path

            segments, info = model.transcribe(process_path, beam_size=5)
            transcript = " ".join(seg.text.strip() for seg in segments).strip()

            print(f"📄 Full transcribe ({info.duration:.1f}s, {info.language}): '{transcript[:80]}...'")

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
            if wav_path and os.path.exists(wav_path):
                os.unlink(wav_path)

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

        # Save chunk to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        wav_path = None
        try:
            # Convert WebM to WAV — critical for mic chunks!
            process_path = convert_to_wav(tmp_path)
            if process_path != tmp_path:
                wav_path = process_path

            segments, info = model.transcribe(
                process_path,
                beam_size=3,
                language=None,
                without_timestamps=True,
                condition_on_previous_text=False
            )
            raw_parts = []
            for seg in segments:
                raw_parts.append(seg.text.strip())
            raw_transcript = " ".join(raw_parts).strip()

            # Filter out ONLY exact Whisper hallucinations on silence
            hallucination_exact = {
                'thank you.', 'thank you', 'thanks for watching.',
                'bye.', 'bye', 'thanks.', 'thanks',
                'you', 'the end.', 'the end',
                'subscribe.', 'like and subscribe.',
                '...', '♪', 'music', ''
            }
            cleaned = raw_transcript.lower().strip()
            if cleaned in hallucination_exact or len(cleaned) < 2:
                transcript = ''
            else:
                transcript = raw_transcript

            print(f"🎙️ Chunk ({info.duration:.1f}s, {info.language}): raw='{raw_transcript}' → final='{transcript}'")

            return jsonify({
                "success": True,
                "transcript": transcript,
                "language": info.language,
                "duration": round(info.duration, 2)
            })
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            if wav_path and os.path.exists(wav_path):
                os.unlink(wav_path)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Chunk transcription failed: {str(e)}"}), 500


if __name__ == '__main__':
    print("🎙️  NeuroShield Audio API running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=False)

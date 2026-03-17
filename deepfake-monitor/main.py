"""
NeuroShield Deepfake Monitor — FastAPI WebSocket Server

Endpoints:
  GET  /health          Health check
  WS   /ws/video        Receives base64 JPEG frames, returns face deepfake scores
  WS   /ws/audio        Receives base64 PCM chunks, returns voice authenticity scores
"""
import os
import asyncio
import base64
import json
import logging
import time
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("neuroshield.monitor")


# ---------------------------------------------------------------------------
# Startup: lazy-load detectors so the server boots fast
# ---------------------------------------------------------------------------
_face_detector = None
_voice_detector = None
_asr_model = None



@asynccontextmanager
async def lifespan(app: FastAPI):
    global _face_detector, _voice_detector, _asr_model
    logger.info("🛡️  NeuroShield Deepfake Monitor starting up…")
    try:
        from detectors.face_detector import FaceDeepfakeDetector
        _face_detector = FaceDeepfakeDetector()
        logger.info("✅ Face detector ready")
    except Exception as e:
        logger.error("❌ Face detector failed to load: %s", e)

    try:
        from detectors.voice_detector import VoiceDeepfakeDetector
        _voice_detector = VoiceDeepfakeDetector()
        logger.info("✅ Voice detector ready")
    except Exception as e:
        logger.error("❌ Voice detector failed to load: %s", e)

        # Optional ASR (offline) — requires Vosk model on disk
    try:
        from vosk import Model
        model_dir = os.path.join(os.path.dirname(__file__), "models", "vosk-model-small-en-us-0.15")
        if os.path.isdir(model_dir):
            _asr_model = Model(model_dir)
            logger.info("✅ ASR model ready")
        else:
            logger.warning("⚠️  ASR model not found at %s", model_dir)
    except Exception as e:
        logger.error("❌ ASR model failed to load: %s", e)
    yield
    logger.info("NeuroShield Monitor shutting down.")


app = FastAPI(
    title="NeuroShield Deepfake Monitor",
    description="Real-time deepfake & voice clone detection API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "NeuroShield Deepfake Monitor",
        "face_detector": _face_detector is not None,
        "voice_detector": _voice_detector is not None,
        "asr_model": _asr_model is not None,

    }


# ---------------------------------------------------------------------------
# Video WebSocket: /ws/video
# ---------------------------------------------------------------------------
@app.websocket("/ws/video")
async def video_ws(ws: WebSocket):
    await ws.accept()
    client = ws.client
    logger.info("Video WS connected: %s", client)
    frame_count = 0

    try:
        while True:
            raw = await ws.receive_text()
            payload = json.loads(raw)

            if payload.get("type") != "frame":
                continue

            frame_count += 1
            t0 = time.perf_counter()

            # Decode base64 JPEG → numpy BGR
            img_bytes = base64.b64decode(payload["data"])
            frame_bgr = _decode_jpeg(img_bytes)

            # Run detector in thread pool so we don't block the event loop
            if _face_detector and frame_bgr is not None:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, _face_detector.analyze_frame, frame_bgr
                )
            else:
                result = {"score": 20.0, "label": "real", "confidence": 0, "method": "detector_unavailable"}

            elapsed = int((time.perf_counter() - t0) * 1000)

            await ws.send_text(json.dumps({
                "type": "face_result",
                "frameId": payload.get("frameId", frame_count),
                "timestamp": payload.get("timestamp", time.time() * 1000),
                "latency_ms": elapsed,
                **result,
            }))

    except WebSocketDisconnect:
        logger.info("Video WS disconnected: %s (frames processed: %d)", client, frame_count)
    except Exception as e:
        logger.error("Video WS error: %s", e)
        try:
            await ws.close(code=1011)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Audio WebSocket: /ws/audio
# ---------------------------------------------------------------------------
@app.websocket("/ws/audio")
async def audio_ws(ws: WebSocket):
    await ws.accept()
    client = ws.client
    logger.info("Audio WS connected: %s", client)
    chunk_count = 0

    try:
        while True:
            raw = await ws.receive_text()
            payload = json.loads(raw)

            if payload.get("type") != "audio":
                continue

            chunk_count += 1
            t0 = time.perf_counter()

            pcm_bytes = base64.b64decode(payload["data"])
            sample_rate = payload.get("sampleRate", 44100)

            if _voice_detector:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, _voice_detector.analyze_chunk, pcm_bytes, sample_rate
                )
            else:
                result = {"score": 20.0, "label": "real", "confidence": 0, "method": "detector_unavailable"}

            elapsed = int((time.perf_counter() - t0) * 1000)

            await ws.send_text(json.dumps({
                "type": "voice_result",
                "chunkId": payload.get("chunkId", chunk_count),
                "timestamp": payload.get("timestamp", time.time() * 1000),
                "latency_ms": elapsed,
                **result,
            }))

    except WebSocketDisconnect:
        logger.info("Audio WS disconnected: %s (chunks processed: %d)", client, chunk_count)
    except Exception as e:
        logger.error("Audio WS error: %s", e)
        try:
            await ws.close(code=1011)
        except Exception:
            pass

@app.websocket("/ws/asr")
async def asr_ws(ws: WebSocket):
    await ws.accept()
    client = ws.client
    logger.info("ASR WS connected: %s", client)
    chunk_count = 0

    if _asr_model is None:
        await ws.send_text(json.dumps({
            "type": "asr_error",
            "message": "ASR model unavailable on server"
        }))
        await ws.close(code=1011)
        return

    try:
        from vosk import KaldiRecognizer
        recognizer = KaldiRecognizer(_asr_model, 16000)
        recognizer.SetWords(False)

        while True:
            raw = await ws.receive_text()
            payload = json.loads(raw)

            if payload.get("type") != "audio":
                continue

            chunk_count += 1
            pcm_bytes = base64.b64decode(payload["data"])
            sample_rate = payload.get("sampleRate", 44100)

            if sample_rate != 16000:
                pcm_bytes = _resample_pcm_to_16k(pcm_bytes, sample_rate)

            if recognizer.AcceptWaveform(pcm_bytes):
                result = json.loads(recognizer.Result())
                text = (result.get("text") or "").strip()
                if text:
                    await ws.send_text(json.dumps({
                        "type": "asr_final",
                        "text": text,
                        "timestamp": payload.get("timestamp", time.time() * 1000),
                    }))
            else:
                partial = json.loads(recognizer.PartialResult()).get("partial", "").strip()
                if partial:
                    await ws.send_text(json.dumps({
                        "type": "asr_partial",
                        "text": partial,
                        "timestamp": payload.get("timestamp", time.time() * 1000),
                    }))

    except WebSocketDisconnect:
        logger.info("ASR WS disconnected: %s (chunks processed: %d)", client, chunk_count)
    except Exception as e:
        logger.error("ASR WS error: %s", e)
        try:
            await ws.close(code=1011)
        except Exception:
            pass

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _decode_jpeg(img_bytes: bytes):
    """Decode JPEG bytes to BGR numpy array."""
    try:
        import cv2
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as e:
        logger.debug("JPEG decode error: %s", e)
        return None

def _resample_pcm_to_16k(pcm_bytes: bytes, sample_rate: int) -> bytes:
    """Resample 16-bit PCM bytes to 16kHz mono using librosa if needed."""
    if sample_rate == 16000:
        return pcm_bytes
    try:
        audio = np.frombuffer(pcm_bytes, dtype="<i2").astype(np.float32) / 32768.0
        if audio.size == 0:
            return pcm_bytes
        import librosa
        resampled = librosa.resample(audio, orig_sr=sample_rate, target_sr=16000)
        resampled = np.clip(resampled, -1.0, 1.0)
        return (resampled * 32767.0).astype("<i2").tobytes()
    except Exception as e:
        logger.debug("ASR resample error: %s", e)
        return pcm_bytes

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, log_level="info")

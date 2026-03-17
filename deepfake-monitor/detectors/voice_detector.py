"""
NeuroShield Deepfake Monitor — Voice Deepfake Detector

Uses an open-source spectrogram-based approach for voice authenticity analysis.
Features are extracted with librosa; detection uses a lightweight CNN (ONNX).
Falls back to acoustic heuristics if ONNX model is unavailable.

Referenced open-source work:
- AASIST (Clova AI, 2021) — Apache 2.0: https://github.com/clovaai/aasist
- ASVspoof2021 baseline models
"""

import os
import io
import time
import logging
import struct
import numpy as np

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
VOICE_MODEL_PATH = os.path.join(MODELS_DIR, "voice_detector.onnx")

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    logger.warning("librosa not available — voice detector disabled.")

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ORT_AVAILABLE = False
    logger.warning("onnxruntime not available — voice detector uses heuristics.")


class VoiceDeepfakeDetector:
    """
    Detects AI-synthesised / voice-cloned audio.

    Pipeline:
      1. Decode raw PCM bytes → numpy float32 waveform
      2. Extract mel-spectrogram + MFCC features via librosa
      3. Run ONNX voice classifier if available
      4. Fallback: acoustic heuristics (GAN artifacts, pitch smoothness, etc.)
    """

    # Acoustic properties — tuned for typical TTS/voice-clone artifacts
    _MIN_PITCH_VAR = 8.0       # Hz — real speech has higher pitch variation
    _MAX_ZCR_SMOOTH = 0.012    # real speech has bursty zero-crossing patterns
    _GAN_ARTIFACT_FREQ = 5500  # Hz — TTS often has energy spikes here

    def __init__(self):
        self.session = None
        self._score_history = []
        self._load_model()

    def _load_model(self):
        if not ORT_AVAILABLE:
            return
        if os.path.exists(VOICE_MODEL_PATH):
            try:
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                opts.inter_op_num_threads = 2
                self.session = ort.InferenceSession(VOICE_MODEL_PATH, opts)
                logger.info("VoiceDetector: ONNX model loaded from %s", VOICE_MODEL_PATH)
            except Exception as e:
                logger.error("VoiceDetector ONNX load error: %s", e)
        else:
            logger.warning(
                "VoiceDetector: No model at %s — using acoustic heuristics. "
                "Run setup_models.py to download.", VOICE_MODEL_PATH
            )

    # -------------------------------------------------------------------------
    def analyze_chunk(self, pcm_bytes: bytes, sample_rate: int = 44100) -> dict:
        """
        Analyze a chunk of raw PCM audio (16-bit signed, mono/stereo).
        Returns: { score: float 0-100, label: str, confidence: int, method: str }
        """
        t0 = time.perf_counter()

        if not pcm_bytes or len(pcm_bytes) < 512:
            return self._make_result(20.0, "real", 0, "insufficient_data")

        try:
            waveform = self._decode_pcm(pcm_bytes, sample_rate)
        except Exception as e:
            logger.debug("PCM decode error: %s", e)
            return self._make_result(20.0, "real", 0, "decode_error")

        if len(waveform) < sample_rate * 0.1:   # need at least 100ms of audio
            return self._make_result(20.0, "real", 0, "too_short")

        # Resample to 16kHz for feature extraction (standard for speech models)
        if LIBROSA_AVAILABLE and sample_rate != 16000:
            waveform = librosa.resample(waveform, orig_sr=sample_rate, target_sr=16000)
            sr = 16000
        else:
            sr = sample_rate

        # --- Model path ---
        if self.session is not None and LIBROSA_AVAILABLE:
            try:
                score, method = self._infer_onnx(waveform, sr)
            except Exception as e:
                logger.debug("ONNX inference error: %s — falling back", e)
                score, method = self._heuristic(waveform, sr)
        else:
            score, method = self._heuristic(waveform, sr)

        # Smooth score over last 5 chunks
        self._score_history.append(score)
        if len(self._score_history) > 5:
            self._score_history.pop(0)
        smoothed = float(np.mean(self._score_history))

        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        label = "fake" if smoothed > 55 else "real"
        confidence = min(99, int(abs(smoothed - 50) * 2))

        logger.debug("Voice | %s | score=%.1f | %dms", label, smoothed, elapsed_ms)
        return self._make_result(smoothed, label, confidence, method)

    # -------------------------------------------------------------------------
    def _decode_pcm(self, pcm_bytes: bytes, sample_rate: int) -> np.ndarray:
        """Convert raw 16-bit little-endian PCM bytes to float32 mono waveform."""
        n_samples = len(pcm_bytes) // 2
        waveform = np.frombuffer(pcm_bytes, dtype="<i2").astype(np.float32) / 32768.0
        # Mix stereo to mono if needed
        if len(waveform) % 2 == 0:
            try:
                waveform = waveform.reshape(-1, 2).mean(axis=1)
            except ValueError:
                pass
        return waveform

    # -------------------------------------------------------------------------
    def _infer_onnx(self, waveform: np.ndarray, sr: int) -> tuple[float, str]:
        """
        Run ONNX model inference.
        Input shape: (1, 1, 64, T) mel-spectrogram.
        Output: (1, 2) log-softmax [fake_prob, real_prob].
        """
        mel = librosa.feature.melspectrogram(
            y=waveform, sr=sr, n_fft=512, hop_length=160,
            n_mels=64, fmax=8000
        )
        mel_db = librosa.power_to_db(mel, ref=np.max)
        # Pad or truncate to fixed width (128 frames ≈ 1.3s at 16kHz/160hop)
        target_len = 128
        if mel_db.shape[1] < target_len:
            mel_db = np.pad(mel_db, ((0, 0), (0, target_len - mel_db.shape[1])))
        else:
            mel_db = mel_db[:, :target_len]
        # Normalise to [0, 1]
        mel_db = (mel_db - mel_db.min()) / (mel_db.max() - mel_db.min() + 1e-6)
        inp = mel_db[np.newaxis, np.newaxis, :, :].astype(np.float32)  # (1,1,64,128)

        input_name = self.session.get_inputs()[0].name
        outputs = self.session.run(None, {input_name: inp})
        probs = outputs[0][0]   # [fake_prob, real_prob]
        # Softmax if raw logits
        probs = np.exp(probs) / np.sum(np.exp(probs))
        fake_score = float(probs[0]) * 100.0
        return fake_score, "onnx_spectrogram_cnn"

    # -------------------------------------------------------------------------
    def _heuristic(self, waveform: np.ndarray, sr: int) -> tuple[float, str]:
        """
        Acoustic heuristic deepfake detection (no model required).

        Key signals:
        1. Pitch variation — TTS tends to be unnaturally smooth
        2. Zero-crossing rate variance — GAN voices have lower ZCR burstiness
        3. High-frequency energy spike — TTS models often have artifacts ~5–6kHz
        4. Spectral flatness — synthesised audio is flatter than real speech
        """
        if not LIBROSA_AVAILABLE:
            return 30.0, "heuristic_no_librosa"

        scores = []

        # 1. Pitch variation
        try:
            f0, voiced, _ = librosa.pyin(
                waveform, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"),
                sr=sr, frame_length=512
            )
            voiced_f0 = f0[voiced > 0.5] if f0 is not None else np.array([])
            if len(voiced_f0) > 5:
                pitch_var = np.std(voiced_f0)
                # Low pitch variation → more likely fake
                pitch_score = max(0, 100 - (pitch_var / self._MIN_PITCH_VAR) * 30)
                scores.append(("pitch_var", pitch_score))
        except Exception:
            pass

        # 2. ZCR variance — real speech is more bursty
        try:
            zcr = librosa.feature.zero_crossing_rate(waveform, frame_length=512, hop_length=160)[0]
            zcr_var = np.var(zcr)
            zcr_score = max(0, 100 - (zcr_var / self._MAX_ZCR_SMOOTH) * 40)
            scores.append(("zcr", zcr_score))
        except Exception:
            pass

        # 3. High-frequency artifact at ~5.5kHz
        try:
            fft = np.abs(np.fft.rfft(waveform, n=2048))
            freqs = np.fft.rfftfreq(2048, d=1.0 / sr)
            artifact_band = (freqs >= 5000) & (freqs <= 6000)
            normal_band = (freqs >= 200) & (freqs <= 4000)
            artifact_ratio = fft[artifact_band].mean() / (fft[normal_band].mean() + 1e-9)
            hf_score = min(100, artifact_ratio * 150)
            scores.append(("hf_artifact", hf_score))
        except Exception:
            pass

        # 4. Spectral flatness — higher means more noise-like / synthesised
        try:
            flatness = librosa.feature.spectral_flatness(y=waveform, n_fft=512, hop_length=160)[0]
            flat_mean = float(np.mean(flatness))
            flat_score = min(100, flat_mean * 5000)
            scores.append(("spectral_flatness", flat_score))
        except Exception:
            pass

        if not scores:
            return 30.0, "heuristic_no_features"

        weights = {"pitch_var": 0.35, "zcr": 0.25, "hf_artifact": 0.2, "spectral_flatness": 0.2}
        weighted_sum = sum(weights.get(k, 0.25) * v for k, v in scores)
        total_weight = sum(weights.get(k, 0.25) for k, _ in scores)
        combined = weighted_sum / total_weight

        return combined, "heuristic_acoustic"

    @staticmethod
    def _make_result(score, label, confidence, method):
        return {
            "score": round(score, 1),
            "label": label,
            "confidence": confidence,
            "method": method,
        }

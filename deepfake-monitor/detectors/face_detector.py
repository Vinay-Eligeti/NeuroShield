"""
NeuroShield Deepfake Monitor — Face Deepfake Detector

Uses MesoNet4 (open-source, MIT license) for deepfake detection.
Source: https://github.com/DariusAf/MesoNet
Falls back to landmark-based heuristics if model weights are unavailable.
"""

import os
import time
import logging
import numpy as np

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MESONET_WEIGHTS = os.path.join(MODELS_DIR, "mesonet4.pth")

# --- MesoNet4 Architecture (PyTorch) -----------------------------------------
# Original paper: Afchar et al. 2018 — MIT License
# Re-implemented in PyTorch; architecture matches the original Keras version.

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available — face detector will use heuristic mode.")

try:
    import cv2
    import mediapipe as mp
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("OpenCV/MediaPipe not available — face detector disabled.")


class MesoNet4(nn.Module):
    """MesoNet-4: Lightweight 4-layer CNN for face deepfake detection.
    Input: (B, 3, 256, 256) normalised RGB image.
    Output: (B, 1) sigmoid score — 1.0 = real, 0.0 = fake.
    """
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(3, 8, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.BatchNorm2d(8),
            nn.MaxPool2d(2, 2),       # 128
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(8, 8, 5, padding=2),
            nn.ReLU(inplace=True),
            nn.BatchNorm2d(8),
            nn.MaxPool2d(2, 2),       # 64
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(8, 16, 5, padding=2),
            nn.ReLU(inplace=True),
            nn.BatchNorm2d(16),
            nn.MaxPool2d(2, 2),       # 32
        )
        self.conv4 = nn.Sequential(
            nn.Conv2d(16, 16, 5, padding=2),
            nn.ReLU(inplace=True),
            nn.BatchNorm2d(16),
            nn.MaxPool2d(4, 4),       # 8
        )
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.5),
            nn.Linear(16 * 8 * 8, 16),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Dropout(0.5),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.conv4(x)
        return self.fc(x)


class FaceDeepfakeDetector:
    """
    Detects deepfakes in video frames.
    
    Pipeline:
      1. Detect face with MediaPipe (CPU-optimised)
      2. Crop + normalise face ROI to 256×256
      3. Run MesoNet4 inference → real/fake probability
      4. If model unavailable: run landmark-based heuristic
    """

    def __init__(self):
        self.model = None
        self.face_mesh = None
        self._blink_history = []
        self._prev_landmarks = None
        self._frame_count = 0
        self._load_model()
        self._load_mediapipe()

    def _load_model(self):
        if not TORCH_AVAILABLE:
            logger.info("FaceDetector: PyTorch unavailable — heuristic mode.")
            return
        try:
            self.model = MesoNet4()
            if os.path.exists(MESONET_WEIGHTS):
                state = torch.load(MESONET_WEIGHTS, map_location="cpu")
                # Support both raw state_dict and wrapped checkpoints
                if "state_dict" in state:
                    state = state["state_dict"]
                self.model.load_state_dict(state, strict=False)
                logger.info("FaceDetector: MesoNet4 weights loaded from disk.")
            else:
                logger.warning(
                    "FaceDetector: No weights at %s — using untrained MesoNet4 "
                    "(heuristic mode). Run setup_models.py to download weights.",
                    MESONET_WEIGHTS,
                )
                self.model = None   # fallback to heuristic
            if self.model:
                self.model.eval()
        except Exception as e:
            logger.error("FaceDetector model load error: %s", e)
            self.model = None

    def _load_mediapipe(self):
        if not CV2_AVAILABLE:
            return
        try:
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
        except Exception as e:
            logger.error("MediaPipe init error: %s", e)

    # -------------------------------------------------------------------------
    def analyze_frame(self, frame_bgr: np.ndarray) -> dict:
        """
        Analyze a BGR frame for deepfake signals.
        Returns: { score: float 0-100, label: str, confidence: int, method: str }
        """
        self._frame_count += 1
        t0 = time.perf_counter()

        if frame_bgr is None or frame_bgr.size == 0:
            return self._make_result(50, "unknown", 0, "error")

        # --- Face detection & landmark extraction ---
        landmarks = None
        face_roi = None
        if self.face_mesh and CV2_AVAILABLE:
            rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            res = self.face_mesh.process(rgb)
            if res.multi_face_landmarks:
                lm = res.multi_face_landmarks[0].landmark
                h, w = frame_bgr.shape[:2]
                xs = [int(p.x * w) for p in lm]
                ys = [int(p.y * h) for p in lm]
                x1, x2 = max(0, min(xs) - 20), min(w, max(xs) + 20)
                y1, y2 = max(0, min(ys) - 20), min(h, max(ys) + 20)
                face_roi = frame_bgr[y1:y2, x1:x2]
                landmarks = [(p.x, p.y, p.z) for p in lm]

        # --- Model inference path ---
        if self.model and face_roi is not None and TORCH_AVAILABLE:
            try:
                score, method = self._infer_mesonet(face_roi)
            except Exception as e:
                logger.debug("MesoNet inference error: %s — falling back", e)
                score, method = self._heuristic(landmarks)
        else:
            score, method = self._heuristic(landmarks)

        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        label = "fake" if score > 55 else "real"
        confidence = min(99, int(abs(score - 50) * 2))

        logger.debug("Frame %d | %s | score=%.1f | %dms", self._frame_count, label, score, elapsed_ms)
        return self._make_result(score, label, confidence, method)

    # -------------------------------------------------------------------------
    def _infer_mesonet(self, face_roi: np.ndarray) -> tuple[float, str]:
        """Run MesoNet4 forward pass. Returns (fake_score_0_to_100, method_str)."""
        rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (256, 256))
        tensor = torch.from_numpy(resized).permute(2, 0, 1).float() / 255.0
        tensor = tensor.unsqueeze(0)  # (1, 3, 256, 256)
        with torch.no_grad():
            real_prob = self.model(tensor).item()   # 1.0 = real, 0.0 = fake
        fake_score = (1.0 - real_prob) * 100.0
        return fake_score, "mesonet4"

    # -------------------------------------------------------------------------
    def _heuristic(self, landmarks) -> tuple[float, str]:
        """
        Landmark-based deepfake heuristic when model weights are absent.
        
        Signals used:
        - Facial symmetry anomaly (deepfakes often have left/right asymmetry)
        - Temporal landmark jitter (deepfake warping causes frame-to-frame jitter)
        - Eye aspect ratio (blink rate anomaly — deepfakes often miss blinks)
        """
        if landmarks is None:
            return 30.0, "heuristic_no_face"

        lm = np.array([(p[0], p[1]) for p in landmarks])

        # 1. Symmetry score — compare left/right half distances
        nose_x = lm[1, 0]  # nose tip
        left_pts = lm[lm[:, 0] < nose_x]
        right_pts = lm[lm[:, 0] > nose_x]
        left_spread = np.std(left_pts[:, 1]) if len(left_pts) else 0
        right_spread = np.std(right_pts[:, 1]) if len(right_pts) else 0
        sym_diff = abs(left_spread - right_spread) / (max(left_spread, right_spread) + 1e-6)
        sym_score = min(100, sym_diff * 300)   # high asymmetry → high fake score

        # 2. Temporal jitter score
        jitter_score = 0.0
        flat = lm.flatten()
        if self._prev_landmarks is not None:
            diff = np.abs(flat - self._prev_landmarks)
            jitter = np.mean(diff) * 1000
            jitter_score = min(100, jitter * 5)
        self._prev_landmarks = flat.copy()

        # 3. Blink rate anomaly (EAR using eye landmarks)
        # MediaPipe indices: left eye top=386, bottom=374, left=263, right=362
        try:
            ear = self._eye_aspect_ratio(lm, [386, 374, 263, 362])
            self._blink_history.append(ear)
            if len(self._blink_history) > 60:
                self._blink_history.pop(0)
            blink_var = np.var(self._blink_history)
            blink_score = max(0, 50 - blink_var * 5000)  # low blink variance → suspicious
        except Exception:
            blink_score = 25.0

        combined = 0.3 * sym_score + 0.3 * jitter_score + 0.4 * blink_score
        return combined, "heuristic_landmarks"

    @staticmethod
    def _eye_aspect_ratio(lm, indices):
        top, bot, left_i, right_i = indices
        v = abs(lm[top, 1] - lm[bot, 1])
        h = abs(lm[left_i, 0] - lm[right_i, 0])
        return v / (h + 1e-6)

    @staticmethod
    def _make_result(score, label, confidence, method):
        return {
            "score": round(score, 1),
            "label": label,
            "confidence": confidence,
            "method": method,
        }

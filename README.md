# 🛡️ NeuroShield

> **India's Digital Arrest Scam Detector** — Analyze suspicious WhatsApp messages in seconds and protect yourself from financial fraud.

---

## 📌 Overview

NeuroShield is a full-stack web application that detects **digital arrest scams** — India's fastest-growing cyber threat. Scammers impersonate CBI officers, ED agents, and police via WhatsApp, threatening fake arrests and demanding immediate payments. NeuroShield lets you paste any suspicious message and receive a detailed threat analysis in seconds.

It also includes the **Antigravity Shield** — a real-time deepfake and voice clone detector for live calls, powered by open-source ML models running entirely on CPU.

**Key context:**
- ₹1,776 Cr lost to cyber fraud in 2024
- 14,000+ digital arrest cases reported in India
- No cloud APIs required — all processing runs locally

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Authority Detection** | Identifies impersonation of CBI, ED, police, RBI, NCB, INTERPOL, and other agencies |
| ⚖️ **Arrest Language Analysis** | Detects fake legal terms like "digital arrest", warrant threats, FIR references, and IPC sections |
| 💳 **Payment Demand Scanner** | Flags UPI, Google Pay, PhonePe, bank transfer, and crypto payment requests |
| ⏰ **Urgency Signal Detection** | Identifies artificial time pressure and panic-inducing language |
| 🔇 **Isolation Tactic Finder** | Detects attempts to cut victims off from family and legitimate authorities |
| 📊 **Risk Score Engine** | Combines all signals into a weighted 0–100 risk score with multi-vector boosting |
| 📈 **Interactive Charts** | Radar chart (threat per category) + Doughnut chart (pattern contribution) |
| ✅ **Action Checklist** | Prioritized safety actions tailored to the detected risk level |
| 🧠 **Scam Flow Visualization** | Visual escalation flow showing which scam stages were detected |

---

## 🏗️ Project Architecture

```
NeuroShield/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx                        # BrowserRouter + Routes
│   │   ├── index.css                      # Global styles & dark theme design system
│   │   ├── pages/
│   │   │   └── DeepfakeMonitor.jsx        # Live deepfake monitor page (/monitor)
│   │   └── components/
│   │       ├── Navbar.jsx                 # Top navigation bar with Monitor link
│   │       ├── HeroSection.jsx            # Landing, stats, and message input
│   │       ├── ProcessingScreen.jsx       # Animated analysis loader
│   │       ├── RiskResult.jsx             # Animated SVG risk gauge (0–100)
│   │       ├── ThreatBreakdown.jsx        # Radar chart + per-category threat cards
│   │       ├── ScamFlowVisualization.jsx  # Escalation flow + doughnut chart
│   │       ├── ExplanationSection.jsx     # Why each flag is suspicious
│   │       ├── ActionChecklist.jsx        # Prioritized action items
│   │       ├── HowItWorks.jsx             # 3-step explainer section
│   │       ├── FeaturesSection.jsx        # Feature highlight cards
│   │       ├── Footer.jsx                 # Footer
│   │       └── monitor/
│   │           ├── ShieldOverlay.jsx      # Animated antigravity shield SVG ring
│   │           ├── AlertBanner.jsx        # Sliding fake-detected alert
│   │           └── LiveStats.jsx          # Score bars + detection log
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/               # Node.js + Express backend (text scam detector)
│   ├── server.js          # REST API server (port 5000)
│   ├── analyzer.js        # Core scam detection engine
│   └── package.json
│
└── deepfake-monitor/     # Python FastAPI backend (live deepfake detector)
    ├── main.py            # WebSocket API server (port 8000)
    ├── setup_models.py    # Downloads open-source model weights
    ├── start_monitor.bat  # One-click Windows launcher
    ├── requirements.txt
    ├── models/            # ONNX / PyTorch weights (downloaded by setup_models.py)
    └── detectors/
        ├── face_detector.py   # MesoNet4 (MIT) + MediaPipe + landmark heuristics
        └── voice_detector.py  # Librosa acoustic features + ONNX CNN
```

---

## 🔬 How the Detection Engine Works

The analyzer (`server/analyzer.js`) uses **weighted, multi-category keyword pattern matching**:

### 5 Threat Categories

| Category | Weight | What It Detects |
|---|---|---|
| **Authority Impersonation** | 25% | CBI, ED, police, RBI, courts, NCB, INTERPOL, etc. |
| **Fake Arrest Language** | 25% | "digital arrest", warrants, FIR, jail, IPC sections, money laundering |
| **Payment Demand** | 20% | UPI, bank transfers, Google Pay, crypto, specific amounts |
| **Urgency Signals** | 15% | "immediately", "24 hours", deadlines, emergency language |
| **Isolation Tactics** | 15% | "don't tell anyone", "stay on the call", "keep camera on" |

### Risk Score Calculation
1. Each category produces a score (0–100) based on keyword match density
2. Category scores are weighted and combined into a total risk score (0–100)
3. **Multi-vector boost**: detecting 2+ categories → up to 30% score boost
4. Final classification:
   - 🟢 **Safe** (0–39): No significant threats
   - 🟡 **Suspicious** (40–69): High-priority safety actions recommended
   - 🔴 **Critical Scam** (70–100): All 10 action items triggered

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- npm

### 1. Start the Backend Server

```bash
cd NeuroShield/server
npm install
npm start
```
The API will be available at `http://localhost:5000`.

### 2. Start the Frontend (Development)

```bash
cd NeuroShield/client
npm install
npm run dev
```
The app will open at `http://localhost:5173` (Vite default).

> **Note:** In development, the client proxies `/api` requests to `localhost:5000`. In production, serve the built client through the Express server or a reverse proxy.

### 3. (Optional) Start the Deepfake Monitor Backend

```bash
cd NeuroShield/deepfake-monitor

# Windows — one-click:
start_monitor.bat

# Or manually:
pip install -r requirements.txt
python setup_models.py   # downloads open-source model weights
python main.py
```
The deepfake API will be available at `http://localhost:8000`.  
Then visit **`http://localhost:5173/monitor`** in your browser to open the Antigravity Shield live monitor.

### 4. Build for Production

```bash
cd NeuroShield/client
npm run build
```

---

## 🎥 Deepfake Monitor — Antigravity Shield

> *"Envision our system as an antigravity shield: a CPU-powered AI guard that scans live video and audio. Any impostor—voice or face—triggers an alert, repelled in real time to keep calls authentic."*

The **Antigravity Shield** is a live-call deepfake detection module accessible at `/monitor`. It uses your webcam and microphone to scan each frame and audio chunk for AI-generated content.

### How It Works

| Step | What Happens |
|---|---|
| 1. **Capture** | Browser grabs webcam frames (4fps) and mic audio (every 600ms) |
| 2. **Stream** | Frames/audio sent as base64 over WebSocket to Python backend |
| 3. **Analyze** | MesoNet4 CNN scans faces; librosa extracts acoustic features for voice |
| 4. **Shield** | Score returned → shield ring updates; if fake > 58%, **shield flares red** |

### Open-Source Models Used

| Model | License | What It Does |
|---|---|---|
| **MesoNet4** | MIT | 4-layer CNN trained on FaceForensics++ — detects GAN face artifacts |
| **MediaPipe Face Mesh** | Apache 2.0 | CPU-optimised face detection & 468-landmark tracking |
| **Librosa** | ISC | Audio feature extraction (MFCC, mel-spectrogram, spectral flatness) |
| **ONNX Runtime** | MIT | Cross-platform ML inference — no GPU required |

### Fallback Mode
If model weights can't be downloaded, the system automatically switches to **heuristic mode**:
- **Face**: Facial symmetry analysis + blink-rate estimation + temporal jitter
- **Voice**: Pitch variation + zero-crossing rate + TTS high-frequency artifact detection

The demo always works — even without model weights downloaded.

### Demo Mode
Click **"🎬 Demo Mode"** (no camera required) to replay a simulated fake-vs-real call sequence and see the shield animate from green → blue → red.

---

## 🌐 API Reference

### `GET /api/health`
Returns service status.

```json
{ "status": "ok", "service": "NeuroShield Scam Detector API" }
```

### `POST /api/analyze`
Analyzes a message for scam patterns.

**Request:**
```json
{ "message": "This is CBI Inspector Sharma. Urgent: Transfer ₹50,000 via UPI immediately." }
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "riskScore": 87,
  "status": "Critical Scam",
  "statusCode": "critical",
  "detectedPatterns": [...],
  "explanations": [...],
  "actions": [...],
  "categoryScores": { ... },
  "totalPatternsFound": 12,
  "messageLengthAnalyzed": 75
}
```

**Constraints:** Message must be a non-empty string, max 10,000 characters.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 + Vite 5 |
| **Routing** | React Router DOM v6 |
| **Charts** | Chart.js 4 + react-chartjs-2 |
| **Styling** | Vanilla CSS (dark theme design system) |
| **Text Scam Backend** | Node.js + Express 4 |
| **Scam Pattern Engine** | Custom rule-based NLP (no external AI/ML APIs) |
| **Deepfake Backend** | Python + FastAPI + Uvicorn (WebSocket) |
| **Face Detection** | MediaPipe Face Mesh (Google, Apache 2.0) |
| **Face Deepfake Model** | MesoNet4 PyTorch implementation (MIT) |
| **Voice Analysis** | Librosa + ONNX Runtime (spectrogram CNN) |

---

## 🛡️ Privacy

NeuroShield does **not** store, log, or transmit analyzed messages to any third party. All analysis happens in-memory on the local server and the result is returned immediately. Messages are never persisted.

---

## 📞 Emergency Resources (India)

| Resource | Contact |
|---|---|
| Cybercrime Helpline | **1930** |
| Online Reporting | [cybercrime.gov.in](https://cybercrime.gov.in) |
| Local Police | **100** |

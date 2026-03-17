const WS_BASE = "ws://localhost:8000";
const ANALYZE_URL = "http://localhost:5000/api/analyze";
const FRAME_INTERVAL_MS = 250;
const AUDIO_INTERVAL_MS = 600;

const WIDTH = 640;
const HEIGHT = 360;

let stream = null;
let videoWs = null;
let audioWs = null;
let asrWs = null;
let frameTimer = null;
let audioTimer = null;
let audioCtx = null;

let transcriptText = "";
let analyzeTimer = null;
let lastAnalyzedText = "";

const statusEl = document.getElementById("status-pill");
const videoEl = document.getElementById("preview");
const canvas = document.getElementById("frameCanvas");
const ctx = canvas.getContext("2d");
const playAudioEl = document.getElementById("playAudio");
const langSelect = document.getElementById("langSelect");

const asrStatusEl = document.getElementById("asrStatus");
const analysisStatusEl = document.getElementById("analysisStatus");
const transcriptEl = document.getElementById("transcript");
const interimEl = document.getElementById("interim");
const scamStatusTextEl = document.getElementById("scam-status-text");
const scamScoreEl = document.getElementById("scamScore");
const scamPatternsEl = document.getElementById("scamPatterns");
const logContainer = document.getElementById("log-container");

playAudioEl.addEventListener("change", () => {
  videoEl.muted = !playAudioEl.checked;
  if (playAudioEl.checked) videoEl.volume = 1;
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "start-capture") startCapture(msg.targetTabId);
  if (msg.type === "stop-capture") stopCapture();
});

function setPill(el, text, state) {
  el.textContent = text;
  el.className = "pill";
  if (state === "good") el.classList.add("active-good");
  if (state === "warn") el.classList.add("active-warn");
  if (state === "bad") el.classList.add("active-bad");
}

function scheduleAnalyze() {
  clearTimeout(analyzeTimer);
  analyzeTimer = setTimeout(runAnalyze, 900);
}

async function runAnalyze() {
  const text = transcriptText.trim();
  if (text.length < 20) return;

  const payload = text.slice(-4000);
  if (payload === lastAnalyzedText) return;
  lastAnalyzedText = payload;

  try {
    setPill(analysisStatusEl, "Analyzing…", "warn");
    const res = await fetch(ANALYZE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: payload })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Analysis failed");
    renderScamResult(data);
    setPill(analysisStatusEl, "Analysis: ok", "good");
  } catch (err) {
    setPill(analysisStatusEl, "Analysis Error", "bad");
    scamStatusTextEl.textContent = `Error: ${err.message}`;
  }
}

function renderScamResult(data) {
  const score = data.riskScore ?? 0;
  const status = data.status ?? "Unknown";
  scamStatusTextEl.textContent = status;
  scamScoreEl.textContent = `${score}%`;
  
  scamScoreEl.style.color = score >= 70 ? "var(--danger)" : score >= 40 ? "var(--warn)" : "var(--safe)";

  scamPatternsEl.innerHTML = "";
  (data.detectedPatterns || []).forEach(p => {
    const tag = document.createElement("span");
    tag.className = "pattern-tag";
    tag.textContent = p.label;
    scamPatternsEl.appendChild(tag);
  });

  if (score === 0) {
    scamPatternsEl.innerHTML = '<span style="color:var(--text-muted); font-size:11px">Safe environment</span>';
  }
}

// -----------------------------------------------------------------------------
// Capture logic
// -----------------------------------------------------------------------------
async function startCapture(targetTabId) {
  stopCapture();
  statusEl.textContent = "Connecting…";

  const streamId = await new Promise((resolve) =>
    chrome.tabCapture.getMediaStreamId({ targetTabId }, resolve)
  );

  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
        maxWidth: 1280,
        maxHeight: 720,
        maxFrameRate: 10
      }
    }
  });

  videoEl.srcObject = stream;
  videoEl.muted = !playAudioEl.checked;
  await videoEl.play();

  const lang = langSelect.value;
  videoWs = new WebSocket(`${WS_BASE}/ws/video`);
  audioWs = new WebSocket(`${WS_BASE}/ws/audio`);
  asrWs = new WebSocket(`${WS_BASE}/ws/asr?lang=${lang}`);

  asrWs.onopen = () => setPill(asrStatusEl, `ASR: ${lang.toUpperCase()}`, "good");
  asrWs.onclose = () => setPill(asrStatusEl, "ASR CLOSED", "warn");
  asrWs.onerror = () => setPill(asrStatusEl, "ASR ERROR", "bad");

  asrWs.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "asr_partial") {
        interimEl.textContent = data.text;
      }
      if (data.type === "asr_final") {
        transcriptText += data.text + " ";
        transcriptEl.textContent = transcriptText.trim();
        interimEl.textContent = "";
        logContainer.scrollTop = logContainer.scrollHeight;
        scheduleAnalyze();
      }
      if (data.type === "asr_error") {
        setPill(asrStatusEl, "ASR NA", "bad");
      }
    } catch {}
  };

  frameTimer = setInterval(sendFrame, FRAME_INTERVAL_MS);

  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);
  const pcmBuffer = [];
  processor.onaudioprocess = (e) => {
    const f32 = e.inputBuffer.getChannelData(0);
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768));
    }
    pcmBuffer.push(...i16);
  };
  source.connect(processor);
  processor.connect(audioCtx.destination);

  audioTimer = setInterval(() => {
    if (audioWs && audioWs.readyState === WebSocket.OPEN) {
      if (pcmBuffer.length > 0) {
        const chunk = new Int16Array(pcmBuffer.splice(0, pcmBuffer.length));
        const b64 = btoa(String.fromCharCode(...new Uint8Array(chunk.buffer)));
        audioWs.send(JSON.stringify({
          type: "audio",
          data: b64,
          sampleRate: 44100,
          chunkId: Date.now(),
          timestamp: Date.now()
        }));
        if (asrWs && asrWs.readyState === WebSocket.OPEN) {
          asrWs.send(JSON.stringify({
            type: "audio",
            data: b64,
            sampleRate: 44100,
            chunkId: Date.now(),
            timestamp: Date.now()
          }));
        }
      }
    }
  }, AUDIO_INTERVAL_MS);

  statusEl.textContent = "LIVE";
  statusEl.classList.add("active-good");
}

function sendFrame() {
  if (!videoWs || videoWs.readyState !== WebSocket.OPEN) return;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  ctx.drawImage(videoEl, 0, 0, WIDTH, HEIGHT);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result.split(",")[1];
      videoWs.send(JSON.stringify({
        type: "frame",
        data: b64,
        frameId: Date.now(),
        timestamp: Date.now()
      }));
    };
    reader.readAsDataURL(blob);
  }, "image/jpeg", 0.7);
}

function stopCapture() {
  statusEl.textContent = "IDLE";
  statusEl.className = "pill";
  if (frameTimer) clearInterval(frameTimer);
  if (audioTimer) clearInterval(audioTimer);
  frameTimer = null;
  audioTimer = null;

  if (videoWs) videoWs.close();
  if (audioWs) audioWs.close();
  if (asrWs) asrWs.close();
  videoWs = null;
  audioWs = null;
  asrWs = null;

  if (audioCtx) audioCtx.close();
  audioCtx = null;

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  videoEl.srcObject = null;
  transcriptText = "";
  transcriptEl.textContent = "Listening…";
  interimEl.textContent = "";
  setPill(asrStatusEl, "ASR OFF");
  setPill(analysisStatusEl, "ANALYSIS IDLE");
}

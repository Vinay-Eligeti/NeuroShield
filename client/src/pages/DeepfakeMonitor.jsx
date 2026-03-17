import { useState, useEffect, useRef, useCallback } from 'react'
import ShieldOverlay from '../components/monitor/ShieldOverlay'
import AlertBanner from '../components/monitor/AlertBanner'
import LiveStats from '../components/monitor/LiveStats'

const WS_BASE = 'ws://localhost:8000'
const FRAME_INTERVAL_MS = 250   // send a video frame every 250ms
const AUDIO_INTERVAL_MS = 600   // send an audio chunk every 600ms
const FAKE_THRESHOLD = 58    // score above this → "fake" alert

// ---------------------------------------------------------------------------
// Demo mode — simulated scores for judges without a camera
// ---------------------------------------------------------------------------
const DEMO_FRAMES = [
    { face: 22, voice: 18 }, { face: 24, voice: 20 },
    { face: 28, voice: 22 }, { face: 30, voice: 25 },
    // Scammer appears — scores spike
    { face: 55, voice: 42 }, { face: 68, voice: 55 },
    { face: 78, voice: 70 }, { face: 82, voice: 75 },
    // Scammer gone — scores normalise
    { face: 60, voice: 55 }, { face: 40, voice: 30 },
    { face: 25, voice: 18 }, { face: 20, voice: 15 },
]

export default function DeepfakeMonitor() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const videoWsRef = useRef(null)
    const audioWsRef = useRef(null)
    const audioCtxRef = useRef(null)
    const frameTimerRef = useRef(null)
    const audioTimerRef = useRef(null)
    const demoTimerRef = useRef(null)
    const frameIdRef = useRef(0)
    const chunkIdRef = useRef(0)

    const [status, setStatus] = useState('idle')   // idle | connecting | live | demo | error
    const [shieldState, setShield] = useState('idle')   // idle | scanning | alert
    const [faceScore, setFaceScore] = useState(0)
    const [voiceScore, setVoiceScore] = useState(0)
    const [alert, setAlert] = useState(null)
    const [logs, setLogs] = useState([])
    const [backendOk, setBackendOk] = useState(null)

    // ---------------------------------------------------------------------------
    // Check backend health on mount
    // ---------------------------------------------------------------------------
    useEffect(() => {
        fetch('http://localhost:8000/health')
            .then(r => r.json())
            .then(() => setBackendOk(true))
            .catch(() => setBackendOk(false))
    }, [])

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------
    const pushLog = useCallback((type, result) => {
        const now = new Date().toLocaleTimeString('en-IN', { hour12: false })
        setLogs(prev => [...prev.slice(-49), { time: now, type, ...result }])
    }, [])

    const handleResult = useCallback((type, result) => {
        const scoreSetter = type === 'face' ? setFaceScore : setVoiceScore
        scoreSetter(result.score)
        pushLog(type, result)

        if (result.label === 'fake' && result.score > FAKE_THRESHOLD) {
            setShield('alert')
            setAlert({ type, ...result })
        } else {
            setShield('scanning')
        }
    }, [pushLog])

    // ---------------------------------------------------------------------------
    // Live camera mode
    // ---------------------------------------------------------------------------
    const startLive = useCallback(async () => {
        setStatus('connecting')
        setShield('scanning')

        // Camera + mic
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
        } catch (err) {
            setStatus('error')
            console.error('Media error:', err)
            return
        }

        // Video WebSocket
        const vws = new WebSocket(`${WS_BASE}/ws/video`)
        videoWsRef.current = vws
        vws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)
                if (data.type === 'face_result') handleResult('face', data)
            } catch { }
        }
        vws.onerror = () => console.warn('Video WS error')

        // Audio WebSocket
        const aws = new WebSocket(`${WS_BASE}/ws/audio`)
        audioWsRef.current = aws
        aws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)
                if (data.type === 'voice_result') handleResult('voice', data)
            } catch { }
        }

        await new Promise(r => setTimeout(r, 500))  // let WS handshakes complete

        // Send frames
        frameTimerRef.current = setInterval(() => {
            if (vws.readyState !== WebSocket.OPEN) return
            const canvas = canvasRef.current
            const video = videoRef.current
            if (!canvas || !video) return
            canvas.width = 320
            canvas.height = 240
            canvas.getContext('2d').drawImage(video, 0, 0, 320, 240)
            canvas.toBlob(blob => {
                if (!blob) return
                const reader = new FileReader()
                reader.onload = () => {
                    const b64 = reader.result.split(',')[1]
                    vws.send(JSON.stringify({
                        type: 'frame',
                        data: b64,
                        frameId: ++frameIdRef.current,
                        timestamp: Date.now(),
                    }))
                }
                reader.readAsDataURL(blob)
            }, 'image/jpeg', 0.7)
        }, FRAME_INTERVAL_MS)

        // Send audio chunks
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 })
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(streamRef.current)
        const processor = audioCtx.createScriptProcessor(4096, 1, 1)
        let pcmBuffer = []

        processor.onaudioprocess = (e) => {
            const f32 = e.inputBuffer.getChannelData(0)
            const i16 = new Int16Array(f32.length)
            for (let i = 0; i < f32.length; i++) {
                i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768))
            }
            pcmBuffer.push(...i16)
        }
        source.connect(processor)
        processor.connect(audioCtx.destination)

        audioTimerRef.current = setInterval(() => {
            if (aws.readyState !== WebSocket.OPEN || pcmBuffer.length === 0) return
            const chunk = new Int16Array(pcmBuffer.splice(0, pcmBuffer.length))
            const b64 = btoa(String.fromCharCode(...new Uint8Array(chunk.buffer)))
            aws.send(JSON.stringify({
                type: 'audio',
                data: b64,
                sampleRate: 44100,
                chunkId: ++chunkIdRef.current,
                timestamp: Date.now(),
            }))
        }, AUDIO_INTERVAL_MS)

        setStatus('live')
    }, [handleResult])

    // ---------------------------------------------------------------------------
    // Demo mode
    // ---------------------------------------------------------------------------
    const startDemo = useCallback(() => {
        setStatus('demo')
        setShield('scanning')
        let i = 0
        demoTimerRef.current = setInterval(() => {
            if (i >= DEMO_FRAMES.length) {
                i = 0
                setFaceScore(0)
                setVoiceScore(0)
                setShield('scanning')
                return
            }
            const f = DEMO_FRAMES[i++]
            setFaceScore(f.face)
            setVoiceScore(f.voice)
            const label = f.face > FAKE_THRESHOLD ? 'fake' : 'real'
            if (label === 'fake') {
                setShield('alert')
                setAlert({ type: 'face', score: f.face, confidence: Math.min(99, (f.face - 50) * 2), label: 'fake' })
            } else {
                setShield('scanning')
            }
            pushLog('face', { score: f.face, label, confidence: Math.min(99, Math.abs(f.face - 50) * 2), method: 'demo' })
            pushLog('voice', { score: f.voice, label: f.voice > FAKE_THRESHOLD ? 'fake' : 'real', confidence: 0, method: 'demo' })
        }, 800)
    }, [pushLog])

    // ---------------------------------------------------------------------------
    // Stop everything
    // ---------------------------------------------------------------------------
    const stop = useCallback(() => {
        clearInterval(frameTimerRef.current)
        clearInterval(audioTimerRef.current)
        clearInterval(demoTimerRef.current)
        videoWsRef.current?.close()
        audioWsRef.current?.close()
        audioCtxRef.current?.close()
        streamRef.current?.getTracks().forEach(t => t.stop())
        if (videoRef.current) videoRef.current.srcObject = null
        setStatus('idle')
        setShield('idle')
        setFaceScore(0)
        setVoiceScore(0)
        setAlert(null)
    }, [])

    useEffect(() => () => stop(), [stop])

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    const isRunning = status === 'live' || status === 'demo'

    return (
        <div className="monitor-page">
            <div className="container" style={{ paddingTop: '100px', paddingBottom: '60px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div className="hero-badge" style={{ display: 'inline-flex', marginBottom: '16px' }}>
                        <span className="pulse-dot" />
                        Deepfake Monitor
                    </div>
                    <h1 style={{ margin: 0 }}>
                        <span className="gradient-text">Antigravity Shield</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '560px', margin: '8px auto 0' }}>
                        Real-time AI guard for live calls. Scans faces and voices every frame —
                        when an impostor tries to slip through, the shield flares and alerts you.
                    </p>
                </div>

                {/* Backend status warning */}
                {backendOk === false && (
                    <div style={{
                        background: 'rgba(234,179,8,0.1)',
                        border: '1px solid rgba(234,179,8,0.4)',
                        borderRadius: '12px', padding: '14px 20px',
                        marginBottom: '24px', color: '#fbbf24', fontSize: '0.85rem',
                    }}>
                        ⚠️ Python backend not detected at <code>localhost:8000</code>.
                        Start it with: <code style={{ fontFamily: 'var(--font-mono)' }}>cd deepfake-monitor &amp;&amp; python main.py</code>
                        &nbsp; — or use <strong>Demo Mode</strong> below.
                    </div>
                )}

                {/* Main layout: camera + stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

                    {/* Camera feed card */}
                    <div style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'relative', aspectRatio: '4/3', background: '#0a0f1c' }}>
                            <video
                                ref={videoRef}
                                muted
                                playsInline
                                style={{
                                    width: '100%', height: '100%', objectFit: 'cover',
                                    display: status === 'live' ? 'block' : 'none',
                                }}
                            />
                            {/* Idle / demo placeholder */}
                            {status !== 'live' && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-muted)', gap: '12px',
                                }}>
                                    <span style={{ fontSize: '4rem', opacity: 0.3 }}>📹</span>
                                    <span style={{ fontSize: '0.85rem' }}>
                                        {status === 'demo' ? '🎬 Demo Mode Running…' : 'Camera inactive'}
                                    </span>
                                </div>
                            )}
                            {/* Shield overlay (always rendered when running) */}
                            {isRunning && (
                                <ShieldOverlay
                                    state={shieldState}
                                    faceScore={faceScore}
                                    voiceScore={voiceScore}
                                />
                            )}
                            {/* Alert banner */}
                            <AlertBanner
                                threat={alert}
                                onDismiss={() => { setAlert(null); setShield('scanning') }}
                            />
                        </div>

                        {/* Controls */}
                        <div style={{
                            padding: '16px 20px',
                            display: 'flex', gap: '12px', alignItems: 'center',
                            borderTop: '1px solid var(--border)',
                        }}>
                            {!isRunning ? (
                                <>
                                    <button
                                        className="analyze-btn"
                                        onClick={startLive}
                                        disabled={status === 'connecting'}
                                        style={{ flex: 1 }}
                                    >
                                        📹 Start Live Monitor
                                    </button>
                                    <button
                                        className="analyze-btn"
                                        onClick={startDemo}
                                        style={{ flex: 1, background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)' }}
                                    >
                                        🎬 Demo Mode
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="analyze-btn"
                                    onClick={stop}
                                    style={{ flex: 1, background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)' }}
                                >
                                    ⏹ Stop Monitor
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats panel */}
                    <LiveStats
                        logs={logs}
                        faceScore={faceScore}
                        voiceScore={voiceScore}
                    />
                </div>

                {/* How the shield works */}
                <div style={{
                    marginTop: '40px',
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
                }}>
                    {[
                        { icon: '🎭', title: 'Face Analysis', desc: 'MesoNet4 (MIT) scans each frame for GAN artifacts, unnatural textures, and blink anomalies.' },
                        { icon: '🎙️', title: 'Voice Analysis', desc: 'Librosa + spectrogram CNN detects pitch smoothness, ZCR patterns, and TTS frequency artifacts.' },
                        { icon: '⚡', title: 'Shield Flare', desc: 'When fake probability exceeds 58%, the antigravity shield flares red and an alert is raised.' },
                    ].map((f, i) => (
                        <div key={i} className="feature-card" style={{ margin: 0 }}>
                            <div className="feature-icon">{f.icon}</div>
                            <h4>{f.title}</h4>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>

            </div>
            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    )
}

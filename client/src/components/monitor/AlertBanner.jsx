import { useEffect, useRef } from 'react'

/**
 * AlertBanner — slides in when a threat is detected.
 * Props:
 *   threat: null | { type: 'face'|'voice', label: string, score: number, confidence: number }
 *   onDismiss: () => void
 */
export default function AlertBanner({ threat, onDismiss }) {
    const timerRef = useRef(null)

    useEffect(() => {
        if (threat) {
            clearTimeout(timerRef.current)
            timerRef.current = setTimeout(onDismiss, 6000)
        }
        return () => clearTimeout(timerRef.current)
    }, [threat, onDismiss])

    if (!threat) return null

    const isFace = threat.type === 'face'
    const icon = isFace ? '🎭' : '🎙️'
    const title = isFace ? 'Face Deepfake Detected' : 'Voice Clone Detected'

    return (
        <div style={{
            position: 'absolute', top: '12px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.6)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: '12px',
            minWidth: '300px', maxWidth: '90%',
            animation: 'slideDown 0.3s ease',
            zIndex: 20,
        }}>
            <style>{`
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
        }
      `}</style>

            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            <div style={{ flex: 1 }}>
                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem' }}>
                    🚨 {title}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                    Fake score: <strong style={{ color: '#f87171' }}>{Math.round(threat.score)}%</strong>
                    {'  ·  '}Confidence: <strong style={{ color: '#f87171' }}>{threat.confidence}%</strong>
                    {'  ·  '}The antigravity shield has flared ⚡
                </div>
            </div>
            <button
                onClick={onDismiss}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '1rem', padding: '4px',
                }}
            >✕</button>
        </div>
    )
}

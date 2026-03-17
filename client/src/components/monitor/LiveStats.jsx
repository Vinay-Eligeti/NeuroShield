import { useEffect, useRef } from 'react'

/**
 * LiveStats — scrollable detection log + rolling mini score bars.
 * Props:
 *   logs: Array<{ time, type, label, score, method }>
 *   faceScore: number
 *   voiceScore: number
 */
export default function LiveStats({ logs, faceScore, voiceScore, status }) {
    const logContainerRef = useRef(null)
    const endRef = useRef(null)

    useEffect(() => {
        if (logContainerRef.current) {
            const container = logContainerRef.current;
            // Scroll internal container to bottom
            container.scrollTop = container.scrollHeight;
        }
    }, [logs])

    const scoreBar = (label, score, color) => (
        <div style={{ marginBottom: '10px' }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px',
            }}>
                <span>{label}</span>
                <span style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {Math.round(score)}%
                </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>
                <div style={{
                    height: '100%', borderRadius: '3px',
                    width: `${score}%`,
                    background: color,
                    transition: 'width 0.4s ease',
                    boxShadow: `0 0 8px ${color}`,
                }} />
            </div>
        </div>
    )

    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            height: '100%',
        }}>
            {/* System Status */}
            {status && (
                <div style={{
                    fontSize: '0.7rem', padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)' }}>Face Model</div>
                        <div style={{ color: status.face?.method ? '#a3e635' : '#fbbf24' }}>
                            {status.face?.info || 'Checking…'}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)' }}>Voice Model</div>
                        <div style={{ color: status.voice?.method ? '#a3e635' : '#fbbf24' }}>
                            {status.voice?.info || 'Checking…'}
                        </div>
                    </div>
                </div>
            )}

            {/* Live score bars */}
            <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    📡 Live Threat Scores
                </h4>
                {scoreBar('Face Deepfake Risk', faceScore, faceScore > 55 ? '#ef4444' : '#a3e635')}
                {scoreBar('Voice Clone Risk', voiceScore, voiceScore > 55 ? '#f97316' : '#a3e635')}
            </div>

            {/* Detection log */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    🗒️ Detection Log
                </h4>
                <div 
                    ref={logContainerRef}
                    style={{
                        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
                        maxHeight: '220px',
                    }}
                >
                    {logs.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Waiting for analysis results…
                        </p>
                    ) : (
                        logs.map((entry, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '6px 10px', borderRadius: '8px',
                                background: entry.label === 'fake'
                                    ? 'rgba(239,68,68,0.08)' : 'rgba(163,230,53,0.06)',
                                fontSize: '0.78rem',
                            }}>
                                <span>{entry.type === 'face' ? '🎭' : '🎙️'}</span>
                                <span style={{ color: entry.label === 'fake' ? '#f87171' : '#86efac', fontWeight: 600 }}>
                                    {entry.label === 'fake' ? 'FAKE' : 'REAL'}
                                </span>
                                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                    {Math.round(entry.score)}% · {entry.method || 'analysis'}
                                </span>
                            </div>
                        ))
                    )}
                    <div ref={endRef} />
                </div>
            </div>
        </div>
    )
}

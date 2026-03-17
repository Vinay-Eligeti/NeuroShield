import './shield.css'

/**
 * ShieldOverlay — animated SVG ring drawn over the webcam feed.
 * Props:
 *   state: 'idle' | 'scanning' | 'alert'
 *   faceScore: number (0-100)
 *   voiceScore: number (0-100)
 */
export default function ShieldOverlay({ state = 'idle', faceScore = 0, voiceScore = 0 }) {
  const color =
    state === 'alert'    ? '#ef4444' :
    state === 'scanning' ? '#3b82f6' :
                           '#a3e635'

  const glowColor =
    state === 'alert'    ? 'rgba(239,68,68,0.4)' :
    state === 'scanning' ? 'rgba(59,130,246,0.3)' :
                           'rgba(163,230,53,0.25)'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg
        viewBox="0 0 300 300"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="shield-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer ring */}
        <circle
          cx="150" cy="150" r="140"
          fill="none"
          stroke={color}
          className={`shield-overlay-ring ${state}`}
          filter="url(#shield-glow)"
        />

        {/* Corner arcs — top-left */}
        <path d="M 30 90 A 130 130 0 0 1 90 30" fill="none" stroke={color} strokeWidth="3" opacity="0.6" />
        {/* top-right */}
        <path d="M 210 30 A 130 130 0 0 1 270 90" fill="none" stroke={color} strokeWidth="3" opacity="0.6" />
        {/* bottom-left */}
        <path d="M 30 210 A 130 130 0 0 0 90 270" fill="none" stroke={color} strokeWidth="3" opacity="0.6" />
        {/* bottom-right */}
        <path d="M 270 210 A 130 130 0 0 1 210 270" fill="none" stroke={color} strokeWidth="3" opacity="0.6" />

        {/* Face score arc — top half */}
        <circle
          cx="150" cy="150" r="128"
          fill="none"
          stroke={faceScore > 55 ? '#ef4444' : color}
          strokeWidth="2"
          strokeDasharray={`${(faceScore / 100) * 402} 402`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-90 150 150)"
          opacity="0.8"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />

        {/* Voice score arc — bottom half */}
        <circle
          cx="150" cy="150" r="118"
          fill="none"
          stroke={voiceScore > 55 ? '#f97316' : color}
          strokeWidth="2"
          strokeDasharray={`${(voiceScore / 100) * 371} 371`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(90 150 150)"
          opacity="0.6"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />

        {/* Status label */}
        <text
          x="150" y="282"
          textAnchor="middle"
          fill={color}
          fontSize="10"
          fontFamily="monospace"
          fontWeight="600"
          letterSpacing="2"
          opacity="0.9"
        >
          {state === 'idle' ? 'SHIELD ACTIVE' : state === 'scanning' ? 'SCANNING…' : 'THREAT DETECTED'}
        </text>
      </svg>
    </div>
  )
}

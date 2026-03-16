import { useEffect, useRef, useState } from 'react'

export default function RiskResult({ result }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const circleRef = useRef(null)
  const radius = 85
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const duration = 1500
    const start = performance.now()
    const target = result.riskScore

    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [result.riskScore])

  const dashOffset = circumference - (result.riskScore / 100) * circumference

  return (
    <div className={`risk-score-card ${result.statusCode}`}>
      <div className="results-header">
        <h2>Threat Analysis Complete</h2>
        <p>
          Analyzed {result.messageLengthAnalyzed} characters •
          Found {result.totalPatternsFound} threat indicators across {result.detectedPatterns.length} categories
        </p>
      </div>

      <div className="risk-gauge">
        <svg viewBox="0 0 200 200">
          <circle
            className="gauge-bg"
            cx="100"
            cy="100"
            r={radius}
          />
          <circle
            ref={circleRef}
            className={`gauge-fill ${result.statusCode}`}
            cx="100"
            cy="100"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="score-text">
          <div className={`score-number ${result.statusCode}`}>
            {animatedScore}
          </div>
          <div className="score-label">RISK SCORE</div>
        </div>
      </div>

      <div className={`risk-status-badge ${result.statusCode}`}>
        {result.statusCode === 'safe' && '✅'}
        {result.statusCode === 'suspicious' && '⚠️'}
        {result.statusCode === 'critical' && '🚨'}
        {' '}{result.status}
      </div>
    </div>
  )
}

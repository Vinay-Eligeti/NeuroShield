import { useState, useEffect } from 'react'

const STEPS = [
  { label: 'Analyzing scam patterns', icon: '🔍' },
  { label: 'Checking authority impersonation', icon: '👮' },
  { label: 'Detecting payment demands', icon: '💳' },
  { label: 'Evaluating urgency signals', icon: '⏰' },
  { label: 'Calculating risk score', icon: '📊' },
]

export default function ProcessingScreen() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => {
        if (prev < STEPS.length - 1) return prev + 1
        return prev
      })
    }, 550)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="processing-overlay">
      <div className="processing-spinner">
        <div className="ring"></div>
        <div className="ring"></div>
        <div className="ring"></div>
        <div className="core"></div>
      </div>

      <div className="processing-steps">
        {STEPS.map((step, i) => {
          let status = ''
          if (i < activeStep) status = 'done'
          else if (i === activeStep) status = 'active'

          return (
            <div key={i} className={`processing-step ${status}`}>
              <div className="step-icon">
                {status === 'done' ? '✓' : step.icon}
              </div>
              {step.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

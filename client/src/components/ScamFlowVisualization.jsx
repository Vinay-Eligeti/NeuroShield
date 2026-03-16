import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const FLOW_STEPS = [
  { key: 'authority', icon: '👮', label: 'Authority', desc: 'Impersonation', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { key: 'arrest', icon: '⚖️', label: 'Arrest Threat', desc: 'Fake legal action', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { key: 'urgency', icon: '⏰', label: 'Urgency', desc: 'Time pressure', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  { key: 'isolation', icon: '🔇', label: 'Isolation', desc: 'Cut off help', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  { key: 'payment', icon: '💸', label: 'Payment', desc: 'Money demand', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
]

export default function ScamFlowVisualization({ categoryScores }) {
  if (!categoryScores) return null

  const activeCategories = Object.entries(categoryScores).filter(([, v]) => v.score > 0)

  const doughnutData = {
    labels: activeCategories.map(([, v]) => v.label),
    datasets: [{
      data: activeCategories.map(([, v]) => v.score),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ].slice(0, activeCategories.length),
      borderColor: 'rgba(10, 15, 28, 1)',
      borderWidth: 3,
      hoverOffset: 8,
    }]
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          padding: 16,
          font: { size: 11, weight: '500' },
          usePointStyle: true,
          pointStyleWidth: 8,
        }
      },
      tooltip: {
        backgroundColor: '#111827',
        borderColor: 'rgba(163, 230, 53, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw}% threat`
        }
      }
    }
  }

  return (
    <div className="section">
      <div className="section-header">
        <div className="section-icon">📊</div>
        <div>
          <h3>Scam Pattern Visualization</h3>
          <p>How scam escalation flows and pattern contribution</p>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: '24px' }}>
        <h4>Scam Escalation Flow</h4>
        <div className="scam-flow">
          {FLOW_STEPS.map((step, i) => {
            const score = categoryScores[step.key]?.score || 0
            const detected = score > 0

            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`flow-step ${detected ? 'detected' : 'not-detected'}`}>
                  <div className="flow-step-icon" style={{ background: step.bg, fontSize: '1.5rem' }}>
                    {step.icon}
                  </div>
                  <span className="flow-step-label" style={{ color: detected ? step.color : 'var(--text-muted)' }}>
                    {step.label}
                  </span>
                  <span className="flow-step-desc">
                    {detected ? `${score}% detected` : 'Not found'}
                  </span>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <span className="flow-arrow" style={{ color: detected ? step.color : 'var(--text-muted)' }}>→</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {activeCategories.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h4>Pattern Contribution</h4>
            <div className="chart-wrapper">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>
          <div className="chart-card">
            <h4>Category Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', height: '100%' }}>
              {activeCategories.map(([key, cat]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: FLOW_STEPS.find(s => s.key === key)?.bg || 'var(--accent-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', flexShrink: 0
                  }}>
                    {FLOW_STEPS.find(s => s.key === key)?.icon || '📌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cat.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {cat.matchCount} pattern{cat.matchCount !== 1 ? 's' : ''} matched
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: cat.score > 70 ? 'var(--critical)' : cat.score > 40 ? 'var(--suspicious)' : 'var(--safe)',
                    fontSize: '0.95rem'
                  }}>
                    {cat.score}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

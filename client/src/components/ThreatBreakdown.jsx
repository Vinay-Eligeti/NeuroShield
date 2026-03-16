import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function ThreatBreakdown({ patterns, categoryScores }) {
  if (!patterns || patterns.length === 0) {
    return (
      <div className="section">
        <div className="section-header">
          <div className="section-icon">🛡️</div>
          <div>
            <h3>Threat Breakdown</h3>
            <p>No significant threats detected in this message</p>
          </div>
        </div>
        <div className="threat-grid">
          <div className="threat-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '2rem', marginBottom: '12px' }}>✅</p>
            <p style={{ color: 'var(--safe)', fontWeight: 600 }}>Message appears safe</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
              No common scam patterns were detected. Stay vigilant regardless.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const radarLabels = Object.values(categoryScores).map(c => c.label)
  const radarData = Object.values(categoryScores).map(c => c.score)

  const chartData = {
    labels: radarLabels,
    datasets: [
      {
        label: 'Threat Level',
        data: radarData,
        backgroundColor: 'rgba(163, 230, 53, 0.15)',
        borderColor: '#a3e635',
        borderWidth: 2,
        pointBackgroundColor: radarData.map(score =>
          score > 70 ? '#ef4444' : score > 40 ? '#eab308' : '#22c55e'
        ),
        pointBorderColor: 'transparent',
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 25,
          color: '#64748b',
          backdropColor: 'transparent',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(163, 230, 53, 0.08)',
        },
        pointLabels: {
          color: '#94a3b8',
          font: { size: 11, weight: '500' }
        },
        angleLines: {
          color: 'rgba(163, 230, 53, 0.08)',
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        borderColor: 'rgba(163, 230, 53, 0.2)',
        borderWidth: 1,
        titleFont: { weight: '600' },
        callbacks: {
          label: (ctx) => `Threat Level: ${ctx.raw}%`
        }
      }
    }
  }

  return (
    <div className="section">
      <div className="section-header">
        <div className="section-icon">🎯</div>
        <div>
          <h3>Threat Breakdown</h3>
          <p>Detected scam tactics and their severity levels</p>
        </div>
      </div>

      <div className="charts-grid" style={{ marginBottom: '24px' }}>
        <div className="chart-card">
          <h4>Threat Radar</h4>
          <div className="chart-wrapper">
            <Radar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {patterns.map((pattern, i) => (
            <div key={i} className="threat-card">
              <div className="threat-card-header">
                <span className="threat-card-label">{pattern.label}</span>
                <span className={`threat-severity ${pattern.severity}`}>
                  {pattern.severity}
                </span>
              </div>
              <div className="threat-bar">
                <div
                  className={`threat-bar-fill ${pattern.severity}`}
                  style={{ width: `${pattern.score}%` }}
                />
              </div>
              <div className="threat-keywords">
                {pattern.matchedKeywords.slice(0, 6).map((kw, j) => (
                  <span key={j} className="keyword-tag">{kw}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

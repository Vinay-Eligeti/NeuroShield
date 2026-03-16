export default function ExplanationSection({ explanations }) {
  if (!explanations || explanations.length === 0) {
    return null
  }

  const severityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      default: return 'ℹ️'
    }
  }

  return (
    <div className="section">
      <div className="section-header">
        <div className="section-icon">💡</div>
        <div>
          <h3>Why This Is Dangerous</h3>
          <p>Understanding the scam tactics used in this message</p>
        </div>
      </div>

      <div className="explanations-grid">
        {explanations.map((exp, i) => (
          <div key={i} className="explanation-card">
            <div className={`explanation-icon ${exp.severity}`}>
              {severityIcon(exp.severity)}
            </div>
            <div className="explanation-content">
              <h4>{exp.category}</h4>
              <p>{exp.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

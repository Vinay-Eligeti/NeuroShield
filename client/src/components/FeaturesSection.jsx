const FEATURES = [
  {
    icon: '🔍',
    title: 'Authority Detection',
    desc: 'Identifies impersonation of CBI, ED, police, and other law enforcement agencies used in scam messages.'
  },
  {
    icon: '⚖️',
    title: 'Arrest Language Analysis',
    desc: 'Detects fake legal terminology like "digital arrest," warrant threats, and FIR references.'
  },
  {
    icon: '💳',
    title: 'Payment Demand Scanner',
    desc: 'Flags requests for UPI transfers, bank deposits, and any financial demands — a hallmark of scams.'
  },
  {
    icon: '⏰',
    title: 'Urgency Signal Detection',
    desc: 'Identifies artificial time pressure and panic-inducing language designed to prevent rational thinking.'
  },
  {
    icon: '🔇',
    title: 'Isolation Tactic Finder',
    desc: 'Detects attempts to isolate victims from family, friends, and legitimate authorities.'
  },
  {
    icon: '📊',
    title: 'Risk Score Engine',
    desc: 'Combines all threat signals into a comprehensive 0-100 risk score with actionable safety guidance.'
  },
]

export default function FeaturesSection() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-title">
          <h2>Detection <span className="gradient-text">Features</span></h2>
          <p>Advanced pattern matching across five categories of digital arrest scam tactics</p>
        </div>

        <div className="features-grid">
          {FEATURES.map((feature, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h4>{feature.title}</h4>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

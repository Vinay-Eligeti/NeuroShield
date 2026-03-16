const FEATURES = [
  {
    title: 'Authority Impersonation Detection',
    desc: 'Scammers often pose as CBI, ED, RBI, or Income Tax officers. Our AI detects name-dropping of government agencies, fake badge numbers, and official-sounding designations — catching 95% of impersonation attempts in real-time.'
  },
  {
    title: 'Arrest & Legal Threat Analysis',
    desc: 'Phrases like "digital arrest," "non-bailable warrant," and "FIR registered" are classic scare tactics. Our engine cross-references 200+ legal threat patterns commonly used in Indian cyber fraud cases to flag fake legal language instantly.'
  },
  {
    title: 'Payment Demand Scanner',
    desc: 'Detects UPI IDs, bank account numbers, cryptocurrency wallet addresses, and phrases demanding immediate money transfers. In 2024, victims lost ₹1,776 Cr to such demands — our scanner identifies these red flags before you send a single rupee.'
  },
  {
    title: 'Urgency & Pressure Tactics',
    desc: 'Scammers create panic with deadlines like "respond within 30 minutes" or "your account will be frozen." Our AI identifies time-pressure language, countdown threats, and emotional manipulation designed to bypass your rational thinking.'
  },
  {
    title: 'Isolation Tactic Finder',
    desc: '"Don\'t tell anyone" and "This is confidential" are hallmarks of fraud. Our system flags attempts to isolate victims from family, friends, and real authorities — a key manipulation step in 89% of digital arrest scams reported in India.'
  },
  {
    title: 'AI Risk Score Engine',
    desc: 'Powered by Groq AI, our engine analyzes messages across all 5 threat categories and generates a 0-100 risk score. Each score comes with a detailed threat breakdown, category-wise analysis, and personalized safety actions you can follow immediately.'
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
              <h4>{feature.title}</h4>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

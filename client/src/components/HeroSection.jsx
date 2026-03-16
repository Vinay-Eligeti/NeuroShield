export default function HeroSection() {
  return (
    <section className="hero" id="home">
      <div className="container">
        <div className="hero-badge">
          <span className="pulse-dot"></span>
          Active Threat Detection
        </div>

        <h1>
          <span className="gradient-text">NeuroShield</span>
        </h1>
        <p className="hero-tagline">India's Digital Arrest Scam Detector</p>
        <p className="hero-description">
          Digital arrest scams are India's fastest-growing cyber threat. Scammers impersonate CBI, ED, and police officers
          via WhatsApp, threatening fake arrests and demanding immediate payment. Our AI-powered engine
          analyzes suspicious messages in seconds and protects you from financial fraud.
        </p>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">₹1,776 Cr</div>
            <div className="stat-label">Lost to cyber fraud (2024)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">14,000+</div>
            <div className="stat-label">Digital arrest cases reported</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">30 sec</div>
            <div className="stat-label">Average analysis time</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">5</div>
            <div className="stat-label">Threat categories detected</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HeroSection({ message, setMessage, onAnalyze, isAnalyzing, error }) {
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

        <div className="analysis-input-wrapper">
          <div className="input-header">
            <div className="icon">📋</div>
            <div>
              <h3>Paste Suspicious Message</h3>
              <p>Copy and paste the WhatsApp message you want to analyze</p>
            </div>
          </div>

          <textarea
            className="message-textarea"
            id="message-input"
            placeholder="Paste the suspicious WhatsApp message here...&#10;&#10;Example: &quot;This is Inspector Sharma from CBI. Your Aadhaar has been used in money laundering. A warrant has been issued. Transfer ₹50,000 via UPI immediately or face digital arrest. Don't tell anyone.&quot;"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={10000}
          />

          <div className="input-footer">
            <span className="char-count">{message.length} / 10,000</span>
            <button
              className="analyze-btn"
              id="analyze-btn"
              onClick={onAnalyze}
              disabled={!message.trim() || isAnalyzing}
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze Threat'}
            </button>
          </div>

          {error && (
            <p style={{ color: 'var(--critical)', marginTop: '12px', fontSize: '0.85rem' }}>
              ⚠️ {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

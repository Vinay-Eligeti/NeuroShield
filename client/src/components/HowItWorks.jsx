export default function HowItWorks() {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="container">
        <div className="section-title">
          <h2>How <span className="gradient-text">It Works</span></h2>
          <p>Three simple steps to protect yourself from digital arrest scams</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-icon">📋</div>
            <div className="step-number">1</div>
            <h4>Paste the Message</h4>
            <p>
              Copy the suspicious WhatsApp message and paste it into our secure analysis box.
              We never store your messages.
            </p>
          </div>

          <div className="step-card">
            <div className="step-icon">🔬</div>
            <div className="step-number">2</div>
            <h4>AI-Powered Analysis</h4>
            <p>
              Our engine scans the message for 100+ scam patterns across 5 threat categories
              including authority impersonation and payment demands.
            </p>
          </div>

          <div className="step-card">
            <div className="step-icon">🛡️</div>
            <div className="step-number">3</div>
            <h4>Get Protected</h4>
            <p>
              Receive a detailed risk score, threat breakdown, and immediate safety actions
              to protect yourself and your finances.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

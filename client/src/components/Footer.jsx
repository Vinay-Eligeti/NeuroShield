export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-logo">🛡️ NeuroShield</div>
          <div className="footer-links">
            <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">
              Cybercrime Portal
            </a>
            <a href="tel:1930">Helpline: 1930</a>
            <a href="#home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
              Back to Top
            </a>
          </div>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} NeuroShield. Built to protect India from digital arrest scams.
          This tool is for educational purposes. If you are a victim, contact local authorities immediately.
        </p>
      </div>
    </footer>
  )
}

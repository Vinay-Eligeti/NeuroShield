import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const isMonitor = location.pathname === '/monitor'
  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo" style={{ textDecoration: 'none' }}>
          <div className="logo-icon">🛡️</div>
          NeuroShield
        </Link>
        <ul className="navbar-links">
          <li><a href="#home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Home</a></li>
          <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works') }}>How it Works</a></li>
          <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }}>Features</a></li>
          <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollTo('footer') }}>About</a></li>
          <li>
            <Link
              to="/monitor"
              style={{
                color: isMonitor ? 'var(--accent)' : undefined,
                fontWeight: isMonitor ? 700 : undefined,
              }}
            >
              🎥 Monitor
            </Link>
          </li>
        </ul>
        <button className="navbar-mobile-toggle" id="mobile-menu-toggle">☰</button>
      </div>
    </nav>
  )
}

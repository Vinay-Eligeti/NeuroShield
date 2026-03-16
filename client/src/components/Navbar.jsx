export default function Navbar() {
  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="logo-icon">🛡️</div>
          NeuroShield
        </div>
        <ul className="navbar-links">
          <li><a href="#home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Home</a></li>
          <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works') }}>How it Works</a></li>
          <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }}>Features</a></li>
          <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollTo('footer') }}>About</a></li>
        </ul>
        <button className="navbar-mobile-toggle" id="mobile-menu-toggle">☰</button>
      </div>
    </nav>
  )
}

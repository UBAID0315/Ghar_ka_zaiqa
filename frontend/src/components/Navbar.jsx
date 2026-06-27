import { useState, useEffect } from 'react'
import logo from '../assets/logo.webp'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Cart } from './icons'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const [hidden, setHidden] = useState(false)
  const { count, setOpen } = useCart()
  const { user, logout, setAuthModalOpen } = useAuth()

  const links = [
    ['Menu', '#menu'],
    ['Offers', '#offers'],
    ['Reviews', '#reviews'],
    ['About', '#about'],
  ]

  useEffect(() => {
    const ids = ['menu', 'offers', 'reviews', 'about']
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 10)
      const diff = y - last
      if (y < 80) {
        setHidden(false)
        last = y
      } else if (diff > 10) {
        setHidden(true)   // scrolling DOWN past threshold → hide nav
        last = y
      } else if (diff < -10) {
        setHidden(false)  // scrolling UP past threshold → show nav
        last = y
      }
      // Active section tracking
      const probe = y + 130
      let cur = ''
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= probe) cur = id
      }
      setActive(y < 220 ? '' : cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleAuthClick = () => {
    if (user && user.role === 'admin') {
      window.location.href = '/admin'
    } else if (user && user.role === 'chef') {
      window.location.href = '/chef'
    } else if (!user) {
      setAuthModalOpen(true)
    }
  }

  const handleLogout = (e) => {
    e.stopPropagation()
    logout()
  }

  return (
    <>
      <header className={`header ${scrolled ? 'scrolled' : ''} ${hidden ? 'nav-hidden' : ''}`}>
        <div className="container nav-bar hero-stagger hs-1">
          <a href="#top" className="brand-logo"><img src={logo} alt="Ghar Ka Zaiqa Lunch Box" /></a>
          <nav className="nav-pill">
            {links.map(([t, h]) => (
              <a key={h} href={h} className={active === h.slice(1) ? 'active' : ''} data-testid={`nav-${t.toLowerCase()}`}>{t}</a>
            ))}
          </nav>

          <div className="nav-actions">
            {user ? (
              <div className="nav-user-chip">
                <span className="nav-user-name">
                  <span className="nav-user-role-dot" data-role={user.role} />
                  {user.name}
                </span>
                {(user.role === 'admin' || user.role === 'chef') && (
                  <a
                    href={user.role === 'admin' ? '/admin' : '/chef'}
                    className="nav-dashboard-link"
                  >
                    Dashboard
                  </a>
                )}
                <button className="nav-logout-btn" onClick={handleLogout} data-testid="nav-logout">
                  Logout
                </button>
              </div>
            ) : (
              <button className="btn-login" onClick={handleAuthClick} data-testid="nav-login-button">
                Login
              </button>
            )}
            <button className="nav-cart" data-testid="navbar-cart-button" onClick={() => setOpen(true)} aria-label="Open cart">
              <Cart />
              {count > 0 && <span className="nav-cart-badge">{count}</span>}
            </button>
            <button className="burger" onClick={() => setMenuOpen(true)} aria-label="Open menu"><span /></button>
          </div>
        </div>
      </header>

      <div className={`drawer ${menuOpen ? 'open' : ''}`} onClick={(e) => { if (e.target.classList.contains('drawer')) setMenuOpen(false) }}>
        <div className="drawer-panel">
          <div className="d-head">
            <button className="x-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">&times;</button>
          </div>
          {links.map(([t, h]) => (
            <a key={h} href={h} className={active === h.slice(1) ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t}</a>
          ))}
          {user ? (
            <>
              {(user.role === 'admin' || user.role === 'chef') && (
                <a href={user.role === 'admin' ? '/admin' : '/chef'} className="drawer-login" onClick={() => setMenuOpen(false)}>Dashboard</a>
              )}
              <button className="drawer-login drawer-logout" onClick={() => { logout(); setMenuOpen(false) }}>Logout ({user.name})</button>
            </>
          ) : (
            <button className="drawer-login" onClick={() => { setAuthModalOpen(true); setMenuOpen(false) }}>Login / Register</button>
          )}
        </div>
      </div>
    </>
  )
}

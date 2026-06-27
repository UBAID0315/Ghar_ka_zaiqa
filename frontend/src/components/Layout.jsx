import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import AuthModal from './AuthModal'
import { Cart } from './icons'
import { useCart } from '../context/CartContext'

function smoothScrollTo(targetY) {
  const startY = window.scrollY
  const diff = targetY - startY
  const dur = 900
  let start
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  function step(ts) {
    if (start === undefined) start = ts
    const p = Math.min((ts - start) / dur, 1)
    window.scrollTo(0, startY + diff * ease(p))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export default function Layout({ children }) {
  const { count, setOpen } = useCart()

  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]')
      if (!a) return
      const h = a.getAttribute('href')
      e.preventDefault()
      if (h === '#') return
      if (h === '#top') return smoothScrollTo(0)
      const el = document.getElementById(h.slice(1))
      if (el) smoothScrollTo(el.getBoundingClientRect().top + window.scrollY - 90)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <div className="gkz-app">
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <AuthModal />

      {/* Floating cart button */}
      <button className="fab-cart" data-testid="floating-cart-button" onClick={() => setOpen(true)} aria-label="Open cart">
        <Cart />
        {count > 0 && <span className="fab-badge" data-testid="cart-count-badge">{count}</span>}
      </button>
    </div>
  )
}

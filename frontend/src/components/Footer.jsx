import logo from '../assets/logo.webp'
import { Phone, Clock, Pin, Wa } from './icons'
import { WHATSAPP_NUMBER } from '../data/menu'

export default function Footer() {
  const WA = `https://wa.me/${WHATSAPP_NUMBER}`
  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div>
            <img className="foot-logo" src={logo} alt="Ghar Ka Zaiqa Lunch Box" />
            <p>Home-cooked desi lunch, freshly cooked and delivered across Lahore.</p>
            <div className="foot-soc">
              <a href={WA} target="_blank" rel="noreferrer" aria-label="WhatsApp"><Wa /></a>
              <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg></a>
              <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3a4 4 0 0 0-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2a1 1 0 0 1 1-1z" /></svg></a>
            </div>
          </div>
          <div>
            <h4>Menu</h4>
            <ul className="foot-links">
              <li><a href="#menu">This Week</a></li>
              <li><a href="#offers">Offers</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#reviews">Reviews</a></li>
            </ul>
          </div>
          <div>
            <h4>Reach Us</h4>
            <ul className="foot-links foot-contact">
              <li><Phone /> <a href={`tel:+${WHATSAPP_NUMBER}`} style={{ color: '#fff', fontWeight: 600 }}>0303 5698404</a></li>
              <li><Clock /> Noon&ndash;3 PM, Mon&ndash;Sat</li>
              <li><Pin /> Lahore, Pakistan</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>&copy; 2026 Ghar Ka Zaiqa Lunch Box</span>
          <span>Good food. Good health. Good life.</span>
        </div>
      </div>
    </footer>
  )
}

import { useState, useRef, useEffect } from 'react'

import logo from '../assets/logo.webp'
import dishBiryani from '../assets/dishBiryani.png'
import about from '../assets/about.webp'
import t1 from '../assets/t1.webp'
import t2 from '../assets/t2.webp'
import t3 from '../assets/t3.webp'
import t4 from '../assets/t4.webp'
import t5 from '../assets/t5.webp'

import { weeklyPlans, offers, stats, WHATSAPP_NUMBER } from '../data/menu'
import { useCart } from '../context/CartContext'
import api from '../lib/api'
import { Star, Clock, Check, Plus, Wa, Arrow } from '../components/icons'

const WA = `https://wa.me/${WHATSAPP_NUMBER}`

const reviews = [
  { q: 'Tastes like my mother\u2019s biryani. Reaches the office warm, every time.', n: 'Hamza Tariq', r: 'Office, Gulberg', img: t1 },
  { q: 'A full meal for PKR 400, a new dish daily. Always on time.', n: 'Ayesha Khan', r: 'Student, Johar Town', img: t2 },
  { q: 'Light, fresh, never oily. Exactly what my parents need.', n: 'Bilal Aslam', r: 'Family, Model Town', img: t3 },
  { q: 'Soft roti, daal that tastes like home. No noon cooking now.', n: 'Sana Iqbal', r: 'Home office, DHA', img: t4 },
  { q: 'We order for eight. Hot, sealed, same taste every day.', n: 'Usman Raza', r: 'Team, Faisal Town', img: t5 },
]

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'))
    const seen = new WeakSet()
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { 
        if (e.isIntersecting && !seen.has(e.target)) { 
          seen.add(e.target)
          e.target.classList.add('in') 
        } 
      })
    }, { threshold: 0.12 })
    els.forEach((el) => io.observe(el))
    const t = setTimeout(() => els.forEach((el) => { seen.add(el); el.classList.add('in') }), 500)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [])
}

function CountUp({ value, suffix }) {
  const [n, setN] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect()
        const dur = 1600
        let start
        const step = (ts) => {
          if (start === undefined) start = ts
          const p = Math.min((ts - start) / dur, 1)
          setN(Math.floor((1 - Math.pow(1 - p, 3)) * value))
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value])
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>
}

export default function Home() {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const trackRef = useRef(null)
  const { add } = useCart()
  useReveal()

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  
  const [heroIdx, setHeroIdx] = useState(0)
  const safeMenuItems = Array.isArray(menuItems)
    ? menuItems
    : Array.isArray(menuItems?.items)
      ? menuItems.items
      : []
  const heroImages = Array.from(new Set([dishBiryani, ...safeMenuItems.filter(m => m?.img).map(m => m.img)]))

  useEffect(() => {
    api.get('/menu')
      .then(res => {
        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.items)
            ? res.data.items
            : []
        setMenuItems(data)
      })
      .catch(err => console.error("Could not fetch menu", err))
  }, [])

  useEffect(() => {
    if (heroImages.length <= 1) return
    const t = setInterval(() => {
      setHeroIdx(prev => (prev + 1) % heroImages.length)
    }, 4500)
    return () => clearInterval(t)
  }, [heroImages.length])

  const scrollBy = (dir) => {
    if (trackRef.current) trackRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    const f = e.target
    const ok = ['name', 'phone', 'area'].every((k) => f[k].value.trim())
    if (!ok) {
      ;['name', 'phone', 'area'].forEach((k) => { if (!f[k].value.trim()) f[k].style.borderColor = 'var(--saffron-d)' })
      return
    }
    const order = {
      order_type: 'booking',
      customer_name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      area: f.area.value.trim(),
      address: '',
      week_choice: f.weekChoice.value,
      meals: f.meals.value,
      note: f.note.value.trim(),
      items: [],
      total: 0,
    }
    setBusy(true)
    try {
      await api.post('/orders', order)
      setBusy(false)
      setSent(true)
    } catch (_) {
      alert('Could not send booking request. Please check connection and try again.')
      setBusy(false)
    }
  }

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow hero-stagger hs-2">Lahore &middot; Home Kitchen</span>
            <h1 className="hero-stagger hs-3">Home-cooked lunch, <span className="acc">delivered hot</span>.</h1>
            <p className="lead hero-stagger hs-4">Fresh desi meals across Lahore, noon to 3. A new dish daily for just PKR 400.</p>
            <div className="hero-actions hero-stagger hs-5">
              <a className="btn btn-primary" href="#menu">See the Menu <Arrow /></a>
              <a className="btn btn-wa" href={WA} target="_blank" rel="noreferrer"><Wa /> WhatsApp</a>
            </div>
          </div>
          <div className="plate-wrap hero-stagger">
            <div className="hero-glow" />
            <div className="disc">
              {heroImages.map((src, i) => {
                let status = 'next'
                if (i === heroIdx) status = 'active'
                else if (i === (heroIdx - 1 + heroImages.length) % heroImages.length) status = 'prev'

                return (
                  <div key={src} className={`plate-slide ps-${status}`}>
                    <img className="plate" src={src} alt="Fresh home-cooked meal" />
                  </div>
                )
              })}
              <span className="chip chip-1"><span className="dot" style={{ background: 'var(--green-bright)' }} /> Cooked Fresh</span>
              <span className="chip chip-2"><span className="dot" style={{ background: 'var(--saffron-d)' }} /> Free Delivery 6+</span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="strip">
        <div className="container">
          <div className="strip-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.7.9-5.5-4-3.9 5.5-.8z" /></svg> Fresh Food Daily</div>
          <div className="strip-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg> On-Time Delivery</div>
          <div className="strip-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> Selected Locations</div>
          <div className="strip-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 9.5c0-1.4 1.3-2 3-2s3 .8 3 2-1.5 2-3 2-3 .6-3 2 1.3 2 3 2 3-.6 3-2" /></svg> PKR 400 a Meal</div>
        </div>
      </div>

      {/* MENU */}
      <section className="section menu" id="menu">
        <div className="container">
          <div className="section-head center reveal">
            <div className="steam">
              <svg viewBox="0 0 54 44"><path d="M14 40c0-8 6-9 6-16s-6-8-3-16" /><path d="M27 40c0-8 6-9 6-16s-6-8-3-16" /><path d="M40 40c0-8 6-9 6-16s-6-8-3-16" /></svg>
            </div>
            <span className="eyebrow center">Our Menu</span>
            <h2>This Week on the <span className="acc">Stove</span></h2>
            <p>New dish daily &middot; Tap to add &middot; Mon to Fri</p>
          </div>

          <div className="menu-carousel reveal">
            <button className="carousel-btn prev" onClick={() => scrollBy(-1)} aria-label="Previous dishes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="carousel-track" ref={trackRef}>
              {menuItems.filter(d => d.available).map((d) => (
                <div className={`dish dish-${d.id}`} key={d.id} data-testid={`dish-${d.id}`}>
                  {d.img ? <img className="plate-img" src={d.img} alt={d.name} /> : <div className="plate-img-placeholder">🍽️</div>}
                  <h3>{d.name}</h3>
                  <p className="sub">{d.description || d.sub || 'Fresh & delicious'}</p>
                  <div className="dish-foot">
                    {/* <span className="price">PKR {d.price}</span> */}
                    <button className="add-circle" onClick={() => add(d)} data-testid={`add-${d.id}`} aria-label={`Add ${d.name} to cart`}>
                      <Plus />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="carousel-btn next" onClick={() => scrollBy(1)} aria-label="Next dishes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          <div className="section-head center reveal" style={{ marginTop: '64px' }}>
            <span className="eyebrow center">Weekly Plans</span>
            <h2>Choose Your <span className="acc">Week</span></h2>
            <p>Pick a plan that suits your taste — fresh meals delivered Mon to Fri.</p>
          </div>

          <div className="weekly-plans reveal" id="schedule">
            {weeklyPlans.map((plan) => (
              <div className="weekly-plan-card" key={plan.number}>
                <div className="weekly-plan-watermark">{plan.number}</div>
                <div className="weekly-plan-content">
                  <span className="weekly-plan-label">{plan.label}</span>
                  <h3>{plan.title}</h3>
                  <ul className="weekly-menu-list">
                    {plan.items.map((d) => (
                      <li className={`weekly-menu-item ${d.day.toUpperCase() === todayStr ? 'highlight' : ''}`} key={d.day}>
                        <span>{d.day.toUpperCase()}</span>
                        <span>{d.dish}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-band reveal">
        <div className="container stats-grid">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <b><CountUp value={s.value} suffix={s.suffix} /></b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* OFFERS */}
      <section className="section" id="offers">
        <div className="container">
          <div className="section-head center reveal">
            <span className="eyebrow center">Deals</span>
            <h2>Special Seasonal <span className="acc">Offers</span></h2>
          </div>
          <div className="offers-grid reveal">
            {offers.map((offer) => (
              <div className="offer" key={offer.tag}>
                <span>{offer.tag}</span>
                <h3>{offer.title}</h3>
                <p>{offer.text}</p>
                <a className="offer-action" href="#book">Claim Offer <Arrow /></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="section" id="about">
        <div className="container about-grid">
          <div className="about-media reveal">
            <img src={about} alt="Home-cooked desi meal with roti, rice and lassi" />
            <div className="badge"><img src={logo} alt="" /><div><b>Made with Care</b><span>Fresh &amp; sealed</span></div></div>
          </div>
          <div className="about-divider" />
          <div className="about-copy reveal">
            <span className="eyebrow">Our Kitchen</span>
            <h2>Cooked at <span className="acc">Home</span></h2>
            <p>Fresh ingredients, real recipes, packed with care. Every box is sealed warm and delivered to your door.</p>
            <div className="about-chips">
              <span><Check /> Same-Day Fresh</span>
              <span><Check /> Full Portions</span>
              <span><Check /> Sealed &amp; Warm</span>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section tst" id="reviews">
        <div className="container">
          <div className="section-head center reveal">
            <span className="eyebrow center">Reviews</span>
            <h2>Loved in <span className="acc">Lahore</span></h2>
          </div>
        </div>
        <div className="tst-marquee reveal">
          <div className="tst-track">
            {[...reviews, ...reviews].map((rv, i) => (
              <div className="tcard" key={i} aria-hidden={i >= reviews.length ? 'true' : undefined}>
                <div className="stars">{[0, 1, 2, 3, 4].map((s) => <Star key={s} />)}</div>
                <p>&ldquo;{rv.q}&rdquo;</p>
                <div className="tperson"><img src={rv.img} alt="" /><div><b>{rv.n}</b><span>{rv.r}</span></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="band">
        <div className="container">
          <span className="eyebrow center" style={{ color: 'var(--saffron)' }}>Start Today</span>
          <h2>Start Your <span className="acc">Week</span></h2>
          <p>Home-cooked lunch, sorted.</p>
          <div className="band-actions">
            <a className="btn btn-primary" href="#book">Order Now</a>
            <a className="btn btn-wa" href={WA} target="_blank" rel="noreferrer"><Wa /> WhatsApp</a>
          </div>
        </div>
      </section>

      {/* BOOK */}
      <section className="section book" id="book">
        <div className="container">
          <div className="book-card reveal">
            <div className="book-aside">
              <div className="book-logo-wrap"><img src={logo} alt="Ghar Ka Zaiqa Lunch Box" /></div>
              <div className="book-aside-copy">
                <span className="eyebrow center" style={{ color: 'var(--saffron)' }}>Contact</span>
                <h2>Your Week, <span className="acc">Sorted</span></h2>
              </div>
              <div className="book-contact-list">
                <div className="mini"><Clock /><div><span>Hours</span><b>Noon&ndash;3 PM &middot; Mon&ndash;Sat</b></div></div>
              </div>
            </div>
            <div className="book-form">
              {sent ? (
                <div className="form-ok" data-testid="booking-success">Request sent! The chef will prepare your lunch booking. We will call you shortly to confirm.</div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <div className="form-head">
                    <h3>Send a lunch request</h3>
                    <p>Share your details and we will call to confirm the plan.</p>
                  </div>
                  <div className="field"><label htmlFor="bf-name">Name</label><input id="bf-name" name="name" type="text" placeholder="Sana Iqbal" data-testid="booking-name" /></div>
                  <div className="row2">
                    <div className="field"><label htmlFor="bf-phone">Phone</label><input id="bf-phone" name="phone" type="tel" placeholder="03xx xxxxxxx" data-testid="booking-phone" /></div>
                    <div className="field"><label htmlFor="bf-area">Area</label><input id="bf-area" name="area" type="text" placeholder="Gulberg" data-testid="booking-area" /></div>
                  </div>
                  <div className="row2">
                    <div className="field"><label htmlFor="bf-week">Week</label>
                      <select id="bf-week" name="weekChoice" data-testid="booking-week"><option>Week One</option><option>Week Two</option><option>Either</option></select>
                    </div>
                    <div className="field"><label htmlFor="bf-meals">Meals</label>
                      <select id="bf-meals" name="meals" data-testid="booking-meals"><option>1 meal</option><option>2 meals</option><option>3&ndash;5 meals</option><option>6+ (free delivery)</option></select>
                    </div>
                  </div>
                  <div className="field"><label htmlFor="bf-note">Delivery Note</label><textarea id="bf-note" name="note" placeholder="Preferred delivery time, office address, or any meal preference" rows="4" data-testid="booking-note" /></div>
                  <button className="btn btn-primary" type="submit" disabled={busy} data-testid="booking-submit">{busy ? 'Sending…' : 'Send Booking'} <Arrow /></button>
                  <p className="form-note">No payment now. We call to confirm.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

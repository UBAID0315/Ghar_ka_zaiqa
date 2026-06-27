import { useState, useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { X, Plus, Minus, Trash, Cart } from './icons'

const CONFIRM_SECS = 25

export default function CartDrawer() {
  const { items, open, setOpen, inc, dec, remove, clear, total, count } = useCart()
  const { user, setAuthModalOpen } = useAuth()
  const [form, setForm] = useState({ customer_name: '', phone: '', area: '', address: '', note: '' })
  const [stage, setStage] = useState('cart') // cart | checkout | confirm | done
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  const [confirmSecs, setConfirmSecs] = useState(CONFIRM_SECS)
  const timerRef = useRef(null)
  const orderRef = useRef(null)

  // Pre-fill checkout form from logged-in user profile
  useEffect(() => {
    if (user && user.role === 'customer') {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || user.name || '',
        phone: f.phone || user.phone || '',
        address: f.address || user.address || '',
      }))
    }
  }, [user])

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const goToCheckout = () => {
    // Guard: must be logged in as customer
    if (!user || user.role !== 'customer') {
      setAuthModalOpen(true)
      return
    }
    setStage('checkout')
  }

  const validateAndConfirm = (e) => {
    e.preventDefault()
    setErr('')
    if (!form.customer_name.trim() || !form.phone.trim() || !form.area.trim()) {
      setErr('Please fill in name, phone and area.')
      return
    }
    // Store validated order data and show confirmation dialog
    orderRef.current = {
      order_type: 'cart',
      customer_name: form.customer_name.trim(),
      phone: form.phone.trim(),
      area: form.area.trim(),
      address: form.address.trim(),
      note: form.note.trim(),
      items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
      total,
    }
    setStage('confirm')
    setConfirmSecs(CONFIRM_SECS)
  }

  // 5-second countdown timer for confirmation dialog
  useEffect(() => {
    if (stage !== 'confirm') {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setConfirmSecs((s) => {
        if (s <= 0) {
          clearInterval(timerRef.current)
          placeOrder()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const placeOrder = async () => {
    if (!orderRef.current) return
    clearInterval(timerRef.current)
    setStage('done')
    setSubmitting(true)
    try {
      await api.post('/orders', orderRef.current)
      clear()
    } catch (e) {
      setErr('Could not place the order. Please try again.')
      setStage('checkout')
    } finally {
      setSubmitting(false)
      orderRef.current = null
    }
  }

  const handleModify = () => {
    clearInterval(timerRef.current)
    setStage('cart')
    setOpen(false)
    // Scroll to menu
    setTimeout(() => {
      const el = document.getElementById('menu')
      if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' })
    }, 350)
  }

  const close = () => {
    clearInterval(timerRef.current)
    setOpen(false)
    setTimeout(() => { setStage('cart'); setErr('') }, 300)
  }

  const progressPct = (confirmSecs / CONFIRM_SECS) * 100

  return (
    <div className={`cart-overlay ${open ? 'open' : ''}`} onClick={(e) => { if (e.target.classList.contains('cart-overlay')) close() }}>
      <aside className="cart-panel" data-testid="cart-drawer">
        <div className="cart-head">
          <h3>
            {stage === 'checkout' ? 'Checkout'
              : stage === 'confirm' ? 'Confirm Order'
              : stage === 'done' ? 'Order Sent!'
              : 'Your Cart'}
          </h3>
          <button className="x-btn" onClick={close} data-testid="cart-close-button" aria-label="Close cart"><X /></button>
        </div>

        {/* ── DONE ── */}
        {stage === 'done' ? (
          <div className="cart-body cart-done">
            <h4>Order Sent to Kitchen!</h4>
            <p>Your order has been received by the chef. You'll get a call shortly to confirm delivery.</p>
            <button className="btn btn-primary" onClick={close} data-testid="cart-done-close">Continue Browsing</button>
          </div>

        /* ── CONFIRM DIALOG ── */
        ) : stage === 'confirm' ? (
          <div className="cart-body cart-confirm-dialog">
            <h4>Any last-minute changes?</h4>
            <p className="confirm-sub">Auto-confirming in <b>{confirmSecs}s</b> if no action taken…</p>

            {/* Animated progress bar */}
            <div className="confirm-progress-track">
              <div
                className="confirm-progress-bar"
                style={{ width: `${progressPct}%`, transition: confirmSecs === CONFIRM_SECS ? 'none' : 'width 1s linear' }}
              />
            </div>

            <div className="confirm-actions">
              <button className="btn btn-outline confirm-modify" onClick={handleModify} data-testid="confirm-modify">
                Modify Order
              </button>
              <button className="btn btn-primary confirm-ok" onClick={placeOrder} disabled={submitting} data-testid="confirm-ok">
                Confirm Order
              </button>
            </div>

            <ul className="confirm-order-summary">
              {items.map((i) => (
                <li key={i.id}><span>{i.qty} × {i.name}</span><b>PKR {i.qty * i.price}</b></li>
              ))}
              <li className="confirm-total"><span>Total</span><b>PKR {total}</b></li>
            </ul>
          </div>

        /* ── EMPTY CART ── */
        ) : items.length === 0 ? (
          <div className="cart-body cart-empty">
            <div className="empty-ic"><Cart /></div>
            <h4>Your cart is empty</h4>
            <p>Add some fresh home-cooked dishes from the menu.</p>
            <a href="#menu" className="btn btn-primary" onClick={close}>Browse Menu</a>
          </div>

        /* ── CART / CHECKOUT ── */
        ) : (
          <>
            <div className="cart-body">
              {stage === 'cart' && (
                <div className="cart-items" data-testid="cart-items">
                  {items.map((i) => (
                    <div className="cart-item" key={i.id} data-testid={`cart-item-${i.id}`}>
                      <img src={i.img} alt={i.name} />
                      <div className="cart-item-info">
                        <b>{i.name}</b>
                        <span>PKR {i.price}</span>
                      </div>
                      <div className="qty-control">
                        <button onClick={() => dec(i.id)} data-testid={`cart-dec-${i.id}`} aria-label="Decrease"><Minus /></button>
                        <span data-testid={`cart-qty-${i.id}`}>{i.qty}</span>
                        <button onClick={() => inc(i.id)} data-testid={`cart-inc-${i.id}`} aria-label="Increase"><Plus /></button>
                      </div>
                      <button className="cart-remove" onClick={() => remove(i.id)} data-testid={`cart-remove-${i.id}`} aria-label="Remove"><Trash /></button>
                    </div>
                  ))}
                </div>
              )}

              {stage === 'checkout' && (
                <form className="cart-form" onSubmit={validateAndConfirm} id="checkout-form" noValidate>
                  <div className="field"><label>Name</label><input name="customer_name" value={form.customer_name} onChange={change} placeholder="Sana Iqbal" data-testid="checkout-name" /></div>
                  <div className="field"><label>Phone</label><input name="phone" value={form.phone} onChange={change} placeholder="03xx xxxxxxx" data-testid="checkout-phone" /></div>
                  <div className="field"><label>Area</label><input name="area" value={form.area} onChange={change} placeholder="Gulberg, DHA, etc." data-testid="checkout-area" /></div>
                  <div className="field"><label>Full Address</label><input name="address" value={form.address} onChange={change} placeholder="House #, street, landmark" data-testid="checkout-address" /></div>
                  <div className="field"><label>Note <span style={{fontWeight:400,opacity:.6}}>(optional)</span></label><textarea name="note" value={form.note} onChange={change} rows="2" placeholder="Any special instructions" data-testid="checkout-note" /></div>
                  {err && <p className="cart-err" data-testid="checkout-error">{err}</p>}
                </form>
              )}
            </div>

            <div className="cart-foot">
              <div className="cart-total"><span>Total ({count} item{count > 1 ? 's' : ''})</span><b data-testid="cart-total">PKR {total}</b></div>
              {stage === 'cart' ? (
                <button key="checkout-btn" type="button" className="btn btn-primary cart-cta" onClick={goToCheckout} data-testid="cart-checkout-button">
                  {user && user.role === 'customer' ? <>Checkout <span className="cta-total">PKR {total}</span></> : '🔐 Login to Checkout'}
                </button>
              ) : (
                <button key="placeorder-btn" type="submit" form="checkout-form" className="btn btn-primary cart-cta" disabled={submitting} data-testid="cart-place-order-button">
                  {submitting ? 'Sending…' : 'Place Order'}
                </button>
              )}
              {stage === 'checkout' && <button className="cart-back" onClick={() => setStage('cart')} data-testid="cart-back-button">← Back to cart</button>}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

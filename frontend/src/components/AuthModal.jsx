import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.webp'

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, register } = useAuth()
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!authModalOpen) return null

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const close = () => {
    setAuthModalOpen(false)
    setErr('')
    setForm({ name: '', email: '', password: '', phone: '', address: '' })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setErr('')
    if (!form.email || !form.password) { setErr('Please fill email and password.'); return }
    setBusy(true)
    try {
      await login(form.email, form.password)
      close()
    } catch (e2) {
      setErr(e2?.response?.data?.detail || 'Invalid email or password.')
    } finally { setBusy(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setErr('')
    if (!form.name || !form.email || !form.password) { setErr('Name, email and password are required.'); return }
    if (form.password.length < 6) { setErr('Password must be at least 6 characters.'); return }
    setBusy(true)
    try {
      await register(form.name, form.email, form.password, form.phone, form.address)
      close()
    } catch (e2) {
      setErr(e2?.response?.data?.detail || 'Registration failed. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="auth-modal-overlay" onClick={(e) => { if (e.target.classList.contains('auth-modal-overlay')) close() }}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Sign in or create account">
        <button className="auth-modal-close" onClick={close} aria-label="Close">✕</button>

        <div className="auth-modal-header">
          <img src={logo} alt="Ghar Ka Zaiqa Logo" className="auth-modal-logo" style={{ height: '70px', display: 'block', margin: '0 auto 12px' }} />
          <h2>Welcome to Ghar Ka Zaiqa</h2>
          <p>Sign in to place your order</p>
        </div>

        <div className="auth-tabs">
          <button className={tab === 'login' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setTab('login'); setErr('') }}>Sign In</button>
          <button className={tab === 'register' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setTab('register'); setErr('') }}>Create Account</button>
        </div>

        {tab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <div className="field">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={change} placeholder="your@email.com" autoComplete="email" data-testid="auth-email" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={change} placeholder="••••••••" autoComplete="current-password" data-testid="auth-password" />
            </div>
            {err && <p className="auth-err">{err}</p>}
            <button type="submit" className="btn btn-primary auth-submit" disabled={busy} data-testid="auth-submit">
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="auth-switch">Don't have an account? <button type="button" onClick={() => { setTab('register'); setErr('') }}>Create one</button></p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister} noValidate>
            <div className="field">
              <label>Full Name</label>
              <input type="text" name="name" value={form.name} onChange={change} placeholder="Sana Iqbal" autoComplete="name" data-testid="reg-name" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={change} placeholder="your@email.com" autoComplete="email" data-testid="reg-email" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={change} placeholder="Min. 6 characters" autoComplete="new-password" data-testid="reg-password" />
            </div>
            <div className="field">
              <label>Phone <span className="optional">(optional)</span></label>
              <input type="tel" name="phone" value={form.phone} onChange={change} placeholder="03xx xxxxxxx" data-testid="reg-phone" />
            </div>
            <div className="field">
              <label>Default Address <span className="optional">(optional)</span></label>
              <input type="text" name="address" value={form.address} onChange={change} placeholder="House #, street, area" data-testid="reg-address" />
            </div>
            {err && <p className="auth-err">{err}</p>}
            <button type="submit" className="btn btn-primary auth-submit" disabled={busy} data-testid="reg-submit">
              {busy ? 'Creating account…' : 'Create Account'}
            </button>
            <p className="auth-switch">Already have an account? <button type="button" onClick={() => { setTab('login'); setErr('') }}>Sign in</button></p>
          </form>
        )}
      </div>
    </div>
  )
}

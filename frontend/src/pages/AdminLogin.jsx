import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.webp'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const { user, login } = useAuth()
  const nav = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (!user) return
    if (user.role === 'admin') nav('/admin')
    else if (user.role === 'chef') nav('/chef')
    else nav('/')
  }, [user, nav])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const u = await login(email, password)
      if (u.role === 'admin') nav('/admin')
      else if (u.role === 'chef') nav('/chef')
      else { nav('/') } // customers shouldn't be here
    } catch (e2) {
      setErr(e2?.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit} data-testid="admin-login-form">
        <img src={logo} alt="Ghar Ka Zaiqa" className="admin-login-logo" />
        <h1>Staff Login</h1>
        <p>Admin &amp; Chef access portal</p>
        <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gharkazaiqa.com" data-testid="login-email" /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" data-testid="login-password" /></div>
        {err && <p className="cart-err" data-testid="login-error">{err}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy} data-testid="login-submit">{busy ? 'Signing in…' : 'Sign In'}</button>
        <a href="/" className="admin-back">← Back to site</a>
      </form>
    </div>
  )
}

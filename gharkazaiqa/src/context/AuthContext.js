import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

const INACTIVITY_TIMEOUT = 2 * 60 * 1000 // 2 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // null = checking, false = guest, object = logged in
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const inactivityTimer = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('gkz_token')
    if (!token) { setUser(false); return }
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => { localStorage.removeItem('gkz_token'); setUser(false) })
  }, [])

  // Inactivity auto-logout — customer only
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(() => {
      // Will be triggered by the effect below if user is a customer
    }, INACTIVITY_TIMEOUT)
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'customer') {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      return
    }

    const doLogout = () => {
      localStorage.removeItem('gkz_token')
      setUser(false)
      alert('You have been logged out due to inactivity. Please log in again to place an order.')
    }

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(doLogout, INACTIVITY_TIMEOUT)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer() // start timer immediately

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [user])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('gkz_token', res.data.token)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const register = useCallback(async (name, email, password, phone = '', address = '') => {
    const res = await api.post('/auth/register', { name, email, password, phone, address })
    localStorage.setItem('gkz_token', res.data.token)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('gkz_token')
    setUser(false)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, authModalOpen, setAuthModalOpen }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

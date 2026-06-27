import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import logo from '../assets/logo.webp'
import notificationSound from '../assets/notification-bell.wav'

// Play audio notification
function playBeep() {
  try {
    const audio = new Audio(notificationSound)
    audio.play()
  } catch (e) {
    console.error('Failed to play notification alert:', e)
  }
}

function getElapsedText(created_at) {
  const diff = Date.now() - new Date(created_at).getTime()
  if (isNaN(diff)) return '—'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ChefDashboard() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [sortOrder, setSortOrder] = useState('desc') // active (new | preparing) | ready (out_for_delivery | delivered | cancelled) | all
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [timeTick, setTimeTick] = useState(0)
  
  // Track seen order IDs to trigger beeps on new order arrivals
  const seenOrderIds = useRef(new Set())
  const initialLoadDone = useRef(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/orders')
      const allOrders = res.data || []
      setOrders(allOrders)
      
      // Look for any incoming new orders to trigger beep
      const newOrders = allOrders.filter(o => o.status === 'new')
      let hasBrandNew = false
      
      newOrders.forEach(o => {
        if (!seenOrderIds.current.has(o.id)) {
          hasBrandNew = true
          seenOrderIds.current.add(o.id)
        }
      })
      
      // Update our full seen list
      allOrders.forEach(o => seenOrderIds.current.add(o.id))
      
      // Play beep if a new order arrives (skip beep on initial load)
      if (hasBrandNew && initialLoadDone.current && soundEnabled) {
        playBeep()
      }
      
      initialLoadDone.current = true
    } catch (e) {
      console.error('Failed to load orders for chef:', e)
    } finally {
      setLoading(false)
    }
  }, [soundEnabled])

  // Check auth and redirect if not a chef
  useEffect(() => {
    if (user === false) {
      nav('/admin/login')
      return
    }
    if (user && user.role !== 'chef' && user.role !== 'admin') {
      nav('/')
      return
    }
    if (user) load()
  }, [user, load, nav])

  // Poll orders list every 10 seconds
  useEffect(() => {
    if (!user) return
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [user, load])

  // Force re-render elapsed timers every 10 seconds
  useEffect(() => {
    const t = setInterval(() => setTimeTick(prev => prev + 1), 10000)
    return () => clearInterval(t)
  }, [])

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status })
      load()
    } catch (e) {
      alert('Could not update order status.')
    }
  }

  // Filter orders based on chef workflow selection
  const filteredOrders = [...orders]
    .filter(o => {
      if (filter === 'active') return ['new', 'preparing'].includes(o.status)
      if (filter === 'ready') return ['out_for_delivery', 'delivered', 'cancelled'].includes(o.status)
      return true
    })
    .sort((a, b) => {
      const d1 = new Date(a.created_at).getTime()
      const d2 = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? d2 - d1 : d1 - d2
    })

  // Calculate aggregated quantities of items currently in preparation (Preparing status)
  const calculatePrepSummary = () => {
    const summary = {}
    orders
      .filter(o => o.status === 'preparing' || o.status === 'new')
      .forEach(o => {
        if (o.items) {
          o.items.forEach(item => {
            summary[item.name] = (summary[item.name] || 0) + item.qty
          })
        }
      })
    return Object.entries(summary)
  }

  const prepSummary = calculatePrepSummary()

  if (user === null) return <div className="admin-loading">Loading Kitchen…</div>
  if (!user) return null

  return (
    <div className="admin chef-dashboard-root">
      <header className="admin-header">
        <div className="admin-brand">
          <img src={logo} alt="" />
          <div>
            <b>Chef's Kitchen Board</b>
            <span>Ghar Ka Zaiqa</span>
          </div>
        </div>
        <div className="admin-header-right">
          <button 
            className={`sound-toggle-btn ${soundEnabled ? 'sound-on' : 'sound-off'}`} 
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute sound alert' : 'Unmute sound alert'}
          >
            {soundEnabled ? (
              <svg className="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              <svg className="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              </svg>
            )}
            <span>{soundEnabled ? 'Alert Sound: On' : 'Alert Sound: Off'}</span>
          </button>
          <a href="/" className="admin-link">View Site</a>
          <button className="admin-logout" onClick={() => { logout(); nav('/admin/login') }}>Logout</button>
        </div>
      </header>

      <div className="admin-body">
        
        {/* PREP SUMMARY LIST (BATCH PREPARATION BUBBLE) */}
        {prepSummary.length > 0 && (
          <div className="chef-prep-summary-card">
            <h3>Kitchen Prep Summary (Batch Cooking List)</h3>
            <p>Aggregated quantities of items in all active/preparing orders:</p>
            <div className="prep-summary-grid">
              {prepSummary.map(([name, qty]) => (
                <div className="prep-summary-item" key={name}>
                  <span className="prep-item-qty">{qty}x</span>
                  <span className="prep-item-name">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chef-dashboard-controls">
          <div className="chef-filters">
            <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>
              Active Prep ({orders.filter(o => o.status === 'new' || o.status === 'preparing').length})
            </button>
            <button className={filter === 'ready' ? 'active' : ''} onClick={() => setFilter('ready')}>
              Completed / Dispatched ({orders.filter(o => o.status === 'out_for_delivery' || o.status === 'delivered' || o.status === 'cancelled').length})
            </button>
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              All Orders ({orders.length})
            </button>
          </div>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            className="sort-select"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">Loading kitchen orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-empty">No orders found in this category.</div>
        ) : (
          <div className="chef-orders-grid">
            {filteredOrders.map((o) => {
              const isRecent = Date.now() - new Date(o.created_at).getTime() < 300000 // 5 minutes
              return (
                <div className={`chef-order-card status-${o.status} ${isRecent ? 'recent-pulse' : ''}`} key={o.id}>
                  
                  <div className="chef-order-header">
                  <div>
                    <span className={`order-type ${o.order_type}`}>
                      {o.order_type === 'cart' ? 'Storefront Order' : 'Weekly Lunch Request'}
                    </span>
                    <h2 className="chef-customer-name">{o.customer_name}</h2>
                    {o.area && <span className="chef-order-area">Location: {o.area}</span>}
                  </div>
                  
                  <div className="chef-order-meta">
                    <span className={`chef-status-badge s-${o.status}`}>
                      {o.status === 'new' ? 'NEW' : o.status === 'preparing' ? 'PREPARING' : o.status === 'out_for_delivery' ? 'OUT FOR DELIVERY' : o.status.toUpperCase()}
                    </span>
                    <span className="chef-order-timer" title="Time elapsed since order placement">
                      Time Elapsed: {getElapsedText(o.created_at)}
                    </span>
                  </div>
                </div>

                <div className="chef-order-body">
                  {o.items && o.items.length > 0 ? (
                    <div className="chef-items-section">
                      <h4>Items to Cook:</h4>
                      <ul className="chef-items-list">
                        {o.items.map((it, i) => (
                          <li key={i}>
                            <span className="chef-item-qty-circle">{it.qty}</span>
                            <span className="chef-item-dish-name">{it.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    o.order_type === 'booking' && (
                      <div className="chef-booking-details">
                        <h4>Booking Details:</h4>
                        <p>Plan Selected: <b>{o.week_choice || '—'}</b></p>
                        <p>Frequency choice: <b>{o.meals || '—'}</b></p>
                      </div>
                    )
                  )}

                  {o.note && (
                    <div className="chef-order-note-box">
                      <b>Chef Instructions:</b>
                      <p className="chef-note-text">“{o.note}”</p>
                    </div>
                  )}
                </div>

                <div className="chef-order-actions-bar">
                  {o.status === 'new' && (
                    <button 
                      className="chef-action-btn start-prep-btn" 
                      onClick={() => changeStatus(o.id, 'preparing')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg> Accept & Start Cooking
                    </button>
                  )}
                  {o.status === 'preparing' && (
                    <button 
                      className="chef-action-btn mark-ready-btn" 
                      onClick={() => changeStatus(o.id, 'out_for_delivery')}
                    >
                      Food Ready & Dispatch
                    </button>
                  )}
                  {o.status === 'out_for_delivery' && (
                    <button 
                      className="chef-action-btn complete-btn" 
                      onClick={() => changeStatus(o.id, 'delivered')}
                    >
                      Mark Delivered
                    </button>
                  )}
                  
                  {/* Status fallback selectors for adjustments */}
                  {(o.status === 'delivered' || o.status === 'cancelled') && (
                    <span className="chef-action-text-completed">
                      {o.status === 'delivered' ? 'Order completed' : 'Order cancelled'}
                    </span>
                  )}
                </div>
                
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}

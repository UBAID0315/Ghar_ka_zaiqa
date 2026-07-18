import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { normalizeArrayResponse } from '../lib/utils'
import logo from '../assets/logo.webp'

const STATUSES = [
  { key: 'new', label: 'New' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }
  catch { return iso }
}

// ─── Image compression (client-side first, then server-side) ──────────────────

async function compressImageClient(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        let { width: w, height: h } = img
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/webp', 0.8))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

async function uploadImage(base64) {
  try {
    const res = await api.post('/upload-image', { image_data: base64, max_width: 600 })
    return res.data.image_data
  } catch {
    return base64 // fallback to client-compressed version
  }
}

// ─── ORDERS TAB ───────────────────────────────────────────────────────────────

function OrdersTab({ orders, filter, setFilter, sortOrder, setSortOrder, searchQuery, setSearchQuery, loading, changeStatus, removeOrder, stats }) {
  const filteredBySearch = orders.filter(o => {
    if (!searchQuery) return true;
    return o.id && o.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedOrders = [...filteredBySearch].sort((a, b) => {
    const d1 = new Date(a.created_at).getTime()
    const d2 = new Date(b.created_at).getTime()
    return sortOrder === 'desc' ? d2 - d1 : d1 - d2
  })

  return (
    <>
      <div className="admin-stats">
        <div className="astat" data-testid="stat-total"><b>{stats.total}</b><span>Total Orders</span></div>
        <div className="astat hl" data-testid="stat-new"><b>{stats.new}</b><span>New / Pending</span></div>
        <div className="astat" data-testid="stat-today"><b>{stats.today}</b><span>Today</span></div>
        <div className="astat" data-testid="stat-revenue">
          <b>PKR {stats.revenue.toLocaleString()}</b>
          <span>Revenue (Delivered)</span>
        </div>
      </div>

      <div className="admin-filters">
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1}}>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')} data-testid="filter-all">All</button>
          {STATUSES.map((s) => (
            <button key={s.key} className={filter === s.key ? 'active' : ''} onClick={() => setFilter(s.key)} data-testid={`filter-${s.key}`}>{s.label}</button>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="Search Order ID..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          className="admin-search-input"
        />
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
        <div className="admin-loading">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="admin-empty" data-testid="orders-empty">No orders found.</div>
      ) : (
        <div className="orders-list" data-testid="orders-list">
          {sortedOrders.map((o) => (
            <div className={`order-card status-${o.status}`} key={o.id} data-testid={`order-${o.id}`}>
              <div className="order-top">
                <div>
                  <span className={`order-type ${o.order_type}`}>{o.order_type === 'cart' ? 'Cart Order' : 'Lunch Request'}</span>
                  <span style={{marginLeft: '10px', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', whiteSpace: 'nowrap'}}>
                    {o.id.includes('-') ? `ID: ${o.id.split('-')[0].toUpperCase()}` : o.id}
                  </span>
                  <h3>{o.customer_name}</h3>
                  <p className="order-meta">{o.phone} · {o.area}{o.address ? ` · ${o.address}` : ''}</p>
                  <p className="order-time">{fmtTime(o.created_at)}</p>
                </div>
                <div className="order-total-box">
                  {o.total > 0 && <b>PKR {o.total}</b>}
                  <span className={`badge-status s-${o.status}`}>{STATUSES.find((s) => s.key === o.status)?.label || o.status}</span>
                </div>
              </div>
              {o.items && o.items.length > 0 && (
                <ul className="order-items">
                  {o.items.map((it, i) => <li key={i}><span>{it.qty} × {it.name}</span><span>PKR {it.qty * it.price}</span></li>)}
                </ul>
              )}
              {o.order_type === 'booking' && (
                <p className="order-booking">Week: <b>{o.week_choice || '—'}</b> · Meals: <b>{o.meals || '—'}</b></p>
              )}
              {o.note && <p className="order-note">"{o.note}"</p>}
              <div className="order-actions">
                <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} data-testid={`status-select-${o.id}`}>
                  {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <a className="order-wa" href={`https://wa.me/${o.phone.replace(/\D/g, '').replace(/^0/, '92')}`} target="_blank" rel="noreferrer">WhatsApp</a>
                <button className="order-del" onClick={() => removeOrder(o.id)} data-testid={`delete-${o.id}`} title="Delete Order">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── MENU TAB ─────────────────────────────────────────────────────────────────

const BLANK_FORM = { name: '', description: '', price: '', category: 'Main', available: true, img: '' }
const CATEGORIES = ['Main', 'Rice', 'Breakfast', 'Dessert', 'Drinks', 'Sides', 'Snacks']

function MenuTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null) // null | 'new' | {item obj}
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef()

  const load = useCallback(async () => {
    try {
      const r = await api.get('/menu')
      setItems(normalizeArrayResponse(r.data))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(BLANK_FORM); setEditItem('new'); setErr('') }
  const openEdit = (item) => { setForm({ ...BLANK_FORM, ...item, price: String(item.price) }); setEditItem(item); setErr('') }
  const cancelEdit = () => { setEditItem(null); setErr('') }

  const handleImagePick = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const clientCompressed = await compressImageClient(file)
      const serverCompressed = await uploadImage(clientCompressed)
      setForm(f => ({ ...f, img: serverCompressed }))
    } catch { setErr('Image upload failed.') }
    finally { setUploading(false) }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.price) { setErr('Name and price are required.'); return }
    setSaving(true)
    try {
      const payload = { ...form, price: parseInt(form.price, 10) }
      if (editItem === 'new') await api.post('/menu', payload)
      else await api.put(`/menu/${editItem.id}`, payload)
      setEditItem(null)
      load()
    } catch (e2) { setErr(e2?.response?.data?.detail || 'Failed to save.') }
    finally { setSaving(false) }
  }

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this menu item?')) return
    await api.delete(`/menu/${id}`)
    load()
  }

  return (
    <div className="menu-mgmt">
      {/* Header always visible with Add button */}
      <div className="menu-mgmt-header">
        <div>
          <h2>🍽️ Menu Management</h2>
          <p className="menu-mgmt-sub">{items.length} items · Click Edit to modify or Delete to remove</p>
        </div>
        {!editItem && (
          <button className="btn btn-primary" onClick={openNew}>+ Add New Dish</button>
        )}
      </div>

      {/* Add / Edit Form */}
      {editItem && (
        <form className="menu-edit-form" onSubmit={save}>
          <div className="menu-edit-form-header">
            <h3>{editItem === 'new' ? '🆕 Add New Dish' : `✏️ Edit: ${editItem.name}`}</h3>
            <button type="button" className="mef-close" onClick={cancelEdit}>✕ Cancel</button>
          </div>

          <div className="menu-edit-grid">
            <div className="field">
              <label>Dish Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Chicken Karahi" autoFocus />
            </div>
            <div className="field">
              <label>Price (PKR) *</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="e.g. 280" min="1" />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field field-span">
              <label>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Short description of the dish…" />
            </div>

            {/* Image Upload */}
            <div className="field field-span menu-img-upload-field">
              <label>Dish Photo</label>
              <div className="menu-img-upload-row">
                {form.img ? (
                  <div className="menu-img-preview">
                    <img src={form.img} alt="Preview" />
                    <button type="button" className="menu-img-remove" onClick={() => setForm(f => ({...f, img: ''}))}>✕ Remove</button>
                  </div>
                ) : (
                  <div
                    className="menu-img-dropzone"
                    onClick={() => fileRef.current.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImagePick({target:{files:[f]}}) }}
                  >
                    <span className="dropzone-icon">📷</span>
                    <span>{uploading ? 'Compressing & uploading…' : 'Click or drag a photo here'}</span>
                    <span className="dropzone-hint">JPEG/PNG · Auto-compressed for fast loading</span>
                  </div>
                )}
                <input
                  type="file" ref={fileRef} accept="image/*"
                  style={{ display: 'none' }} onChange={handleImagePick}
                />
              </div>
            </div>

            <label className="field-check">
              <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({...f, available: e.target.checked}))} />
              <span>Available for ordering</span>
            </label>
          </div>

          {err && <p className="cart-err">{err}</p>}
          <div className="menu-edit-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? 'Saving…' : uploading ? 'Uploading photo…' : editItem === 'new' ? '✓ Add Dish' : '✓ Save Changes'}
            </button>
            <button type="button" className="btn btn-outline" onClick={cancelEdit}>Cancel</button>
          </div>
        </form>
      )}

      {/* Menu Grid */}
      {loading ? <div className="admin-loading">Loading menu…</div> : (
        items.length === 0 ? (
          <div className="menu-empty-state">
            <div className="mes-icon">🍽️</div>
            <h3>No dishes yet</h3>
            <p>Click "Add New Dish" to add your first menu item.</p>
          </div>
        ) : (
          <div className="menu-items-grid">
            {items.map((item) => (
              <div className={`menu-item-card ${!item.available ? 'unavailable' : ''}`} key={item.id}>
                {/* Dish Photo */}
                <div className="mic-photo">
                  {item.img
                    ? <img src={item.img} alt={item.name} />
                    : <div className="mic-no-photo">📷<span>No photo</span></div>
                  }
                  {!item.available && <span className="mic-badge-unavail">Unavailable</span>}
                </div>

                <div className="mic-body">
                  <div className="mic-top">
                    <div>
                      <b>{item.name}</b>
                      <span className="mic-category">{item.category}</span>
                    </div>
                    <div className="mic-price">PKR {item.price}</div>
                  </div>
                  {item.description && <p className="mic-desc">{item.description}</p>}
                  <div className="mic-actions">
                    <button className="mic-edit" onClick={() => openEdit(item)}>✏️ Edit</button>
                    <button className="mic-delete" onClick={() => deleteItem(item.id)}>🗑 Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────

function AnalyticsTab({ orders }) {
  const delivered = orders.filter(o => o.status === 'delivered')
  const revenue = delivered.reduce((acc, o) => acc + (o.total || 0), 0)
  const avgOrder = delivered.length > 0 ? Math.round(revenue / delivered.length) : 0
  const pendingRevenue = orders
    .filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
    .reduce((acc, o) => acc + (o.total || 0), 0)

  const topItems = (() => {
    const map = {}
    orders.forEach(o => (o.items || []).forEach(it => {
      map[it.name] = (map[it.name] || 0) + it.qty
    }))
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  })()

  const maxQty = topItems.length > 0 ? topItems[0][1] : 1

  const byStatus = STATUSES.map(s => ({
    ...s,
    count: orders.filter(o => o.status === s.key).length,
    color: s.key === 'delivered' ? '#22c55e' : s.key === 'cancelled' ? '#ef4444' : s.key === 'new' ? '#f59e0b' : s.key === 'preparing' ? '#8b5cf6' : '#3b82f6'
  }))

  return (
    <div className="analytics-tab">
      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card kpi-revenue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-data">
            <b>PKR {revenue.toLocaleString()}</b>
            <span>Confirmed Revenue</span>
            <small>From delivered orders only</small>
          </div>
        </div>
        <div className="kpi-card kpi-pending">
          <div className="kpi-icon">⏳</div>
          <div className="kpi-data">
            <b>PKR {pendingRevenue.toLocaleString()}</b>
            <span>Pending Revenue</span>
            <small>Active &amp; in-transit orders</small>
          </div>
        </div>
        <div className="kpi-card kpi-avg">
          <div className="kpi-icon">📈</div>
          <div className="kpi-data">
            <b>PKR {avgOrder.toLocaleString()}</b>
            <span>Avg Order Value</span>
            <small>Based on {delivered.length} delivered</small>
          </div>
        </div>
        <div className="kpi-card kpi-customers">
          <div className="kpi-icon">📋</div>
          <div className="kpi-data">
            <b>{orders.length}</b>
            <span>Total Orders</span>
            <small>All time orders</small>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="analytics-row">
        {/* Top Selling */}
        <div className="analytics-section">
          <div className="as-header">
            <h3>🏆 Top-Selling Dishes</h3>
            <span className="as-sub">By quantity sold</span>
          </div>
          {topItems.length === 0 ? (
            <div className="as-empty">No orders yet — data will appear here once orders come in.</div>
          ) : (
            <div className="top-items-list">
              {topItems.map(([name, qty], i) => (
                <div className="top-item-row" key={name}>
                  <span className="top-item-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
                  <span className="top-item-name">{name}</span>
                  <div className="top-item-bar-wrap">
                    <div className="top-item-bar" style={{ width: `${Math.round((qty / maxQty) * 100)}%` }} />
                  </div>
                  <span className="top-item-qty">{qty} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders by Status */}
        <div className="analytics-section">
          <div className="as-header">
            <h3>📊 Order Status Breakdown</h3>
            <span className="as-sub">{orders.length} total orders</span>
          </div>
          <div className="status-stats">
            {byStatus.map(s => (
              <div className="status-stat-row" key={s.key}>
                <span className={`badge-status s-${s.key}`}>{s.label}</span>
                <div className="top-item-bar-wrap">
                  <div className="top-item-bar" style={{
                    width: orders.length ? `${Math.round((s.count / orders.length) * 100)}%` : '0%',
                    background: s.color
                  }} />
                </div>
                <span className="top-item-qty">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users moved to dedicated tab */}
    </div>
  )
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────

function UsersTab({ users, loadUsers }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'customer' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole })
      loadUsers()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to update role')
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setErr('')
    setSaving(true)
    try {
      await api.post('/users', form)
      setShowAdd(false)
      setForm({ email: '', password: '', name: '', role: 'customer' })
      loadUsers()
    } catch (e2) {
      setErr(e2?.response?.data?.detail || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="users-tab">
      <div className="menu-mgmt-header">
        <div>
          <h2>👥 User Management</h2>
          <p className="menu-mgmt-sub">{users.length} total registered users</p>
        </div>
        {!showAdd && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add New User</button>
        )}
      </div>

      {showAdd && (
        <form className="menu-edit-form" onSubmit={handleAddUser}>
          <div className="menu-edit-form-header">
            <h3>🆕 Add New User</h3>
            <button type="button" className="mef-close" onClick={() => setShowAdd(false)}>✕ Cancel</button>
          </div>
          <div className="menu-edit-grid">
            <div className="field">
              <label>Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="John Doe" />
            </div>
            <div className="field">
              <label>Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="user@example.com" />
            </div>
            <div className="field">
              <label>Password *</label>
              <input required type="password" minLength="6" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Min 6 characters" />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                <option value="customer">Customer</option>
                <option value="chef">Chef</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {err && <p className="cart-err">{err}</p>}
          <div className="menu-edit-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : '✓ Create User'}
            </button>
          </div>
        </form>
      )}

      {users.length === 0 ? (
        <div className="as-empty">No registered users yet.</div>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i}>
                  <td className="ut-num">{i + 1}</td>
                  <td><b>{u.name}</b></td>
                  <td className="ut-email">{u.email}</td>
                  <td>
                    <select 
                      className="role-select" 
                      value={u.role} 
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="customer">Customer</option>
                      <option value="chef">Chef</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{u.phone || <span className="ut-empty">—</span>}</td>
                  <td className="ut-date">{u.created_at ? fmtTime(u.created_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, new: 0, today: 0, revenue: 0 })
  const [filter, setFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')

  const load = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([
        api.get('/orders', { params: { status: filter } }),
        api.get('/orders/stats'),
      ])
      setOrders(normalizeArrayResponse(o.data))
      setStats(s.data || { total: 0, new: 0, today: 0, revenue: 0 })
    } finally { setLoading(false) }
  }, [filter])

  const loadUsers = useCallback(async () => {
    try { const r = await api.get('/users'); setUsers(normalizeArrayResponse(r.data)) } catch { }
  }, [])

  useEffect(() => {
    if (user === false) { nav('/admin/login'); return }
    if (user && user.role !== 'admin') { nav('/'); return }
    if (user) { load(); loadUsers() }
  }, [user, load, loadUsers, nav])

  useEffect(() => {
    if (!user) return
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [user, load])

  const changeStatus = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status })
    load()
  }

  const [deleteToast, setDeleteToast] = useState(null)

  useEffect(() => {
    if (deleteToast) {
      if (deleteToast.seconds > 0) {
        const timer = setTimeout(() => {
          setDeleteToast(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null)
        }, 1000)
        return () => clearTimeout(timer)
      } else {
        api.delete(`/orders/${deleteToast.id}`).then(() => load())
        setDeleteToast(null)
      }
    }
  }, [deleteToast, load])

  const removeOrder = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id))
    setDeleteToast({ id, seconds: 5 })
  }

  if (user === null) return <div className="admin-loading">Loading…</div>
  if (!user) return null

  const tabs = [
    { key: 'orders', label: '📋 Orders', badge: stats.new > 0 ? stats.new : null },
    { key: 'menu', label: '🍽️ Menu' },
    { key: 'users', label: '👥 Users' },
    { key: 'analytics', label: '📊 Analytics' },
  ]

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-brand">
          <img src={logo} alt="" />
          <div><b>Ghar Ka Zaiqa</b><span>Admin Dashboard</span></div>
        </div>
        <div className="admin-header-right">
          <a href="/" className="admin-link">View Site</a>
          <button className="admin-logout" onClick={() => { logout(); nav('/admin/login') }} data-testid="admin-logout">Logout</button>
        </div>
      </header>

      <div className="admin-tabs-bar">
        {tabs.map(t => (
          <button key={t.key} className={`admin-tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
            {t.badge && <span className="tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="admin-body">
        {activeTab === 'orders' && <OrdersTab orders={orders} filter={filter} setFilter={setFilter} sortOrder={sortOrder} setSortOrder={setSortOrder} searchQuery={searchQuery} setSearchQuery={setSearchQuery} loading={loading} changeStatus={changeStatus} removeOrder={removeOrder} stats={stats} />}
        {activeTab === 'menu' && <MenuTab />}
        {activeTab === 'users' && <UsersTab users={users} loadUsers={loadUsers} />}
        {activeTab === 'analytics' && <AnalyticsTab orders={orders} />}
      </div>
      {deleteToast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#262626', color: '#fff', padding: '14px 28px', border: '1px solid #404040', borderRadius: '12px', zIndex: 9999, fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          Order is deleting in {deleteToast.seconds > 0 ? deleteToast.seconds : 'boom'}...
        </div>
      )}
    </div>
  )
}

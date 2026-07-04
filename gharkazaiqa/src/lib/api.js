import axios from 'axios'

// Production (unified Railway deploy): REACT_APP_BACKEND_URL is not set → API calls go to /api on the same origin.
// Local dev: set REACT_APP_BACKEND_URL=http://localhost:8000 in frontend/.env
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || ''
export const API = `${BACKEND_URL}/api`

const api = axios.create({ baseURL: API })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gkz_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api

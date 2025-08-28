import axios from 'axios'

const apiBase = import.meta.env.VITE_API_BASE || '/.netlify/functions/api'

export const api = axios.create({ baseURL: apiBase })

export function setAdminKey(key) {
  api.defaults.headers.common['x-admin-key'] = key
}

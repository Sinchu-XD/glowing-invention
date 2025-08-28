import { useState } from 'react'
import { api, setAdminKey } from '../lib/api'

export default function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/login', { password })
      if (data.ok) {
        setAdminKey(password)
        onSuccess(password)
      }
    } catch (e) {
      setError('Wrong password')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="card max-w-md w-full mx-auto space-y-3">
      <h2 className="text-xl font-semibold">Admin Login</h2>
      <input className="input" placeholder="Admin Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button className="btn bg-black text-white w-full" disabled={loading}>{loading? 'Checking...' : 'Login'}</button>
    </form>
  )
}

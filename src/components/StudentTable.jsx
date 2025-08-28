import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function StudentTable({ isAdmin, onRemove }) {
  const [students, setStudents] = useState([])
  const [q, setQ] = useState('')

  const load = async () => {
    const { data } = await api.get('/students')
    setStudents(data)
  }
  useEffect(() => { load() }, [])

  const filtered = students.filter(s => s.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold">Students</h3>
        <input className="input max-w-xs" placeholder="Search by name" value={q} onChange={e=>setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left t

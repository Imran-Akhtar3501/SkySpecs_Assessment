import React, { useEffect, useState } from 'react'

type Turbine = { id: string; name: string }

export const App: React.FC = () => {
  const [turbines, setTurbines] = useState<Turbine[]>([])
  const [name, setName] = useState('')

  useEffect(() => {
    fetch(import.meta.env.VITE_API_BASE + '/api/turbines')
      .then(r => r.json())
      .then(setTurbines)
      .catch(() => setTurbines([]))
  }, [])

  const create = async () => {
    if (!name) return
    const r = await fetch(import.meta.env.VITE_API_BASE + '/api/turbines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const t = await r.json()
    setTurbines(prev => [t, ...prev])
    setName('')
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>TurbineOps Lite</h1>
      <p>Starter UI – list/create turbines via REST. Extend with Inspections, Findings, and Repair Plans.</p>

      <div style={{ marginBottom: 16 }}>
        <input placeholder="New turbine name" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={create} style={{ marginLeft: 8 }}>Create</button>
      </div>

      <ul>
        {turbines.map(t => <li key={t.id}>{t.name}</li>)}
      </ul>
    </div>
  )
}

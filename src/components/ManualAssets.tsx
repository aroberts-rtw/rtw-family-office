'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Asset = { id: string; name: string; category: string; value: number; notes: string | null }

const CATEGORIES = ['Real Estate', 'Vehicle', 'Business Equity', 'Other']

export default function ManualAssets({ initial }: { initial: Asset[] }) {
  const [assets, setAssets] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', category: 'Real Estate', value: '', notes: '' })
  const router = useRouter()

  const reset = () => { setForm({ name: '', category: 'Real Estate', value: '', notes: '' }); setAdding(false); setEditing(null) }

  const save = async () => {
    if (!form.name || !form.value) return
    if (editing) {
      await fetch(`/api/assets/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setAssets(assets.map((a) => a.id === editing ? { ...a, ...form, value: parseFloat(form.value) } : a))
    } else {
      const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const created = await res.json()
      setAssets([...assets, created])
    }
    reset()
    router.refresh()
  }

  const remove = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    setAssets(assets.filter((a) => a.id !== id))
    router.refresh()
  }

  const startEdit = (a: Asset) => {
    setForm({ name: a.name, category: a.category, value: String(a.value), notes: a.notes ?? '' })
    setEditing(a.id)
    setAdding(true)
  }

  const byCategory = assets.reduce<Record<string, Asset[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="space-y-1">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{cat}</h3>
            <span className="text-xs text-gray-400">{fmt(items.reduce((s, a) => s + a.value, 0))}</span>
          </div>
          {items.map((a) => (
            <div key={a.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                {a.notes && <p className="text-xs text-gray-500 mt-0.5">{a.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold">{fmt(a.value)}</p>
                <button onClick={() => startEdit(a)} className="text-xs text-gray-500 hover:text-white">Edit</button>
                <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:text-red-300">Remove</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {adding ? (
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">{editing ? 'Edit Asset' : 'Add Asset'}</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Name (e.g. Primary Residence)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="col-span-2 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 outline-none"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input
              placeholder="Market value"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 outline-none"
            />
            <input
              placeholder="Notes (optional — e.g. Zillow estimate)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="col-span-2 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="bg-white text-black text-sm px-4 py-2 rounded-lg font-medium hover:bg-gray-100">Save</button>
            <button onClick={reset} className="text-gray-400 text-sm px-4 py-2 rounded-lg hover:text-white">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full border border-dashed border-gray-700 rounded-xl py-3 text-sm text-gray-500 hover:text-white hover:border-gray-500 transition-colors">
          + Add asset
        </button>
      )}
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

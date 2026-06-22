'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Asset = {
  id: string; name: string; category: string; value: number; notes: string | null
  address: string | null
  vehicleYear: number | null; vehicleMake: string | null; vehicleModel: string | null
  vehicleTrim: string | null; vehicleMileage: number | null; zipCode: string | null
  lastRefreshed: Date | null
}

type Form = {
  name: string; category: string; value: string; notes: string
  address: string
  vehicleYear: string; vehicleMake: string; vehicleModel: string
  vehicleTrim: string; vehicleMileage: string; zipCode: string
}

const CATEGORIES = ['Real Estate', 'Vehicle', 'Business Equity', 'Other']
const EMPTY: Form = {
  name: '', category: 'Real Estate', value: '', notes: '',
  address: '', vehicleYear: '', vehicleMake: '', vehicleModel: '',
  vehicleTrim: '', vehicleMileage: '', zipCode: '',
}

export default function ManualAssets({ initial }: { initial: Asset[] }) {
  const [assets, setAssets] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const router = useRouter()

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const reset = () => { setForm(EMPTY); setAdding(false); setEditing(null) }

  const save = async () => {
    if (!form.name || !form.value) return
    const body = {
      ...form,
      value: parseFloat(form.value),
      vehicleYear: form.vehicleYear ? parseInt(form.vehicleYear) : null,
      vehicleMileage: form.vehicleMileage ? parseInt(form.vehicleMileage) : null,
    }
    if (editing) {
      await fetch(`/api/assets/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setAssets(assets.map((a) => a.id === editing ? { ...a, ...body } : a))
    } else {
      const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setAssets([...assets, await res.json()])
    }
    reset()
    router.refresh()
  }

  const remove = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    setAssets(assets.filter((a) => a.id !== id))
    router.refresh()
  }

  const refresh = async (id: string) => {
    setRefreshing(id)
    const res = await fetch(`/api/assets/${id}/refresh`, { method: 'POST' })
    const data = await res.json()
    if (data.value) {
      setAssets(assets.map((a) => a.id === id ? { ...a, value: data.value, lastRefreshed: new Date() } : a))
      router.refresh()
    } else {
      alert(data.error ?? 'Refresh failed')
    }
    setRefreshing(null)
  }

  const startEdit = (a: Asset) => {
    setForm({
      name: a.name, category: a.category, value: String(a.value), notes: a.notes ?? '',
      address: a.address ?? '', vehicleYear: a.vehicleYear ? String(a.vehicleYear) : '',
      vehicleMake: a.vehicleMake ?? '', vehicleModel: a.vehicleModel ?? '',
      vehicleTrim: a.vehicleTrim ?? '', vehicleMileage: a.vehicleMileage ? String(a.vehicleMileage) : '',
      zipCode: a.zipCode ?? '',
    })
    setEditing(a.id)
    setAdding(true)
  }

  const canRefresh = (a: Asset) =>
    (a.category === 'Real Estate' && !!a.address) ||
    (a.category === 'Vehicle' && !!a.vehicleYear && !!a.vehicleMake && !!a.vehicleModel)

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
                <p className="text-xs text-gray-500 mt-0.5">
                  {a.category === 'Real Estate' && a.address ? a.address : ''}
                  {a.category === 'Vehicle' && a.vehicleYear ? `${a.vehicleYear} ${a.vehicleMake} ${a.vehicleModel}` : ''}
                  {a.notes ? (a.address || a.vehicleYear ? ` · ${a.notes}` : a.notes) : ''}
                </p>
                {a.lastRefreshed && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Updated {new Date(a.lastRefreshed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold">{fmt(a.value)}</p>
                {canRefresh(a) && (
                  <button
                    onClick={() => refresh(a.id)}
                    disabled={refreshing === a.id}
                    className="text-xs text-blue-400 hover:text-blue-200 disabled:text-gray-600"
                  >
                    {refreshing === a.id ? 'Refreshing…' : 'Refresh'}
                  </button>
                )}
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
            <input placeholder="Asset name" value={form.name} onChange={(e) => set('name', e.target.value)}
              className="col-span-2 input" />
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Current market value" type="number" value={form.value} onChange={(e) => set('value', e.target.value)}
              className="input" />

            {form.category === 'Real Estate' && (
              <input placeholder="Full address (e.g. 123 Main St, Atlanta, GA 30301)"
                value={form.address} onChange={(e) => set('address', e.target.value)}
                className="col-span-2 input" />
            )}

            {form.category === 'Vehicle' && (<>
              <input placeholder="Year (e.g. 2022)" value={form.vehicleYear} onChange={(e) => set('vehicleYear', e.target.value)} className="input" />
              <input placeholder="Make (e.g. Cadillac)" value={form.vehicleMake} onChange={(e) => set('vehicleMake', e.target.value)} className="input" />
              <input placeholder="Model (e.g. Escalade)" value={form.vehicleModel} onChange={(e) => set('vehicleModel', e.target.value)} className="input" />
              <input placeholder="Trim (e.g. Premium Luxury)" value={form.vehicleTrim} onChange={(e) => set('vehicleTrim', e.target.value)} className="input" />
              <input placeholder="Mileage" type="number" value={form.vehicleMileage} onChange={(e) => set('vehicleMileage', e.target.value)} className="input" />
              <input placeholder="ZIP code" value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} className="input" />
            </>)}

            <input placeholder="Notes (optional)" value={form.notes} onChange={(e) => set('notes', e.target.value)}
              className="col-span-2 input" />
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="bg-white text-black text-sm px-4 py-2 rounded-lg font-medium hover:bg-gray-100">Save</button>
            <button onClick={reset} className="text-gray-400 text-sm px-4 py-2 rounded-lg hover:text-white">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full border border-dashed border-gray-700 rounded-xl py-3 text-sm text-gray-500 hover:text-white hover:border-gray-500 transition-colors">
          + Add asset
        </button>
      )}
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

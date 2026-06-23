'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Policy = {
  id: string; type: string; carrier: string; policyNumber: string | null
  coverageAmount: number | null; annualPremium: number; renewalDate: string | null
  beneficiary: string | null; notes: string | null
  createdAt: string; updatedAt: string
}
type Form = {
  type: string; carrier: string; policyNumber: string
  coverageAmount: string; annualPremium: string; renewalDate: string
  beneficiary: string; notes: string
}

const TYPES = ['Life', 'Health', 'Auto', 'Home', 'Umbrella', 'Disability', 'Long-Term Care', 'Other']
const TYPE_ICONS: Record<string, string> = {
  Life: '❤️', Health: '🏥', Auto: '🚗', Home: '🏠',
  Umbrella: '☂️', Disability: '🛡️', 'Long-Term Care': '👴', Other: '📋',
}
const EMPTY: Form = { type: 'Life', carrier: '', policyNumber: '', coverageAmount: '', annualPremium: '', renewalDate: '', beneficiary: '', notes: '' }

export default function InsuranceClient({ initial }: { initial: Policy[] }) {
  const [policies, setPolicies] = useState(initial)
  const [adding, setAdding]     = useState(false)
  const [editing, setEditing]   = useState<string | null>(null)
  const [form, setForm]         = useState<Form>(EMPTY)
  const router = useRouter()

  const set   = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const reset = () => { setForm(EMPTY); setAdding(false); setEditing(null) }

  const save = async () => {
    if (!form.carrier || !form.annualPremium) return
    if (editing) {
      await fetch(`/api/insurance/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setPolicies(policies.map((p) => p.id === editing ? { ...p, ...form, coverageAmount: form.coverageAmount ? parseFloat(form.coverageAmount) : null, annualPremium: parseFloat(form.annualPremium) } : p))
    } else {
      const res = await fetch('/api/insurance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setPolicies([...policies, await res.json()])
    }
    reset(); router.refresh()
  }

  const remove = async (id: string) => {
    await fetch(`/api/insurance/${id}`, { method: 'DELETE' })
    setPolicies(policies.filter((p) => p.id !== id)); router.refresh()
  }

  const startEdit = (p: Policy) => {
    setForm({ type: p.type, carrier: p.carrier, policyNumber: p.policyNumber ?? '', coverageAmount: p.coverageAmount ? String(p.coverageAmount) : '', annualPremium: String(p.annualPremium), renewalDate: p.renewalDate ? p.renewalDate.split('T')[0] : '', beneficiary: p.beneficiary ?? '', notes: p.notes ?? '' })
    setEditing(p.id); setAdding(true)
  }

  const totalAnnualPremium = policies.reduce((s, p) => s + p.annualPremium, 0)
  const totalCoverage      = policies.reduce((s, p) => s + (p.coverageAmount ?? 0), 0)

  const now = new Date()
  const upcoming = policies.filter((p) => {
    if (!p.renewalDate) return false
    const d = new Date(p.renewalDate)
    const daysOut = (d.getTime() - now.getTime()) / 86400000
    return daysOut >= 0 && daysOut <= 90
  }).sort((a, b) => new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime())

  const byType = TYPES.reduce<Record<string, Policy[]>>((acc, t) => {
    acc[t] = policies.filter((p) => p.type === t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {policies.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Annual Premiums</p>
            <p className="text-2xl font-semibold text-red-400 mt-1">{fmt(totalAnnualPremium)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{fmt(totalAnnualPremium / 12)}/mo</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Coverage</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalCoverage)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Policies</p>
            <p className="text-2xl font-semibold mt-1">{policies.length}</p>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Renewals within 90 days</p>
          {upcoming.map((p) => {
            const d = new Date(p.renewalDate!)
            const days = Math.ceil((d.getTime() - now.getTime()) / 86400000)
            return (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm">{TYPE_ICONS[p.type] ?? '📋'} {p.type} — {p.carrier}</span>
                <span className="text-xs text-yellow-400">
                  {days === 0 ? 'Today' : `${days} days`} · {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {TYPES.map((type) => {
        const group = byType[type]
        if (!group.length) return null
        return (
          <div key={type} className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{TYPE_ICONS[type]} {type}</p>
            {group.map((p) => (
              <div key={p.id} className="bg-gray-900 rounded-xl px-4 py-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{p.carrier}</p>
                    {p.policyNumber && <p className="text-xs text-gray-500 mt-0.5">Policy #{p.policyNumber}</p>}
                    {p.beneficiary && <p className="text-xs text-gray-500">Beneficiary: {p.beneficiary}</p>}
                  </div>
                  <div className="flex gap-3 text-xs ml-4">
                    <button onClick={() => startEdit(p)} className="text-gray-500 hover:text-white">Edit</button>
                    <button onClick={() => remove(p.id)} className="text-red-500 hover:text-red-300">Remove</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Annual Premium</p>
                    <p className="text-sm font-medium text-red-400">{fmt(p.annualPremium)}</p>
                  </div>
                  {p.coverageAmount && (
                    <div>
                      <p className="text-xs text-gray-500">Coverage</p>
                      <p className="text-sm font-medium">{fmt(p.coverageAmount)}</p>
                    </div>
                  )}
                  {p.renewalDate && (
                    <div>
                      <p className="text-xs text-gray-500">Renewal</p>
                      <p className="text-sm font-medium">
                        {new Date(p.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
                {p.notes && <p className="text-xs text-gray-500">{p.notes}</p>}
              </div>
            ))}
          </div>
        )
      })}

      {adding ? (
        <div className="bg-gray-900 rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium">{editing ? 'Edit Policy' : 'Add Policy'}</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className="input">
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Carrier (e.g. State Farm)" value={form.carrier} onChange={(e) => set('carrier', e.target.value)} className="input" />
            <input placeholder="Policy number" value={form.policyNumber} onChange={(e) => set('policyNumber', e.target.value)} className="input" />
            <input placeholder="Annual premium ($)" type="number" value={form.annualPremium} onChange={(e) => set('annualPremium', e.target.value)} className="input" />
            <input placeholder="Coverage amount ($)" type="number" value={form.coverageAmount} onChange={(e) => set('coverageAmount', e.target.value)} className="input" />
            <input placeholder="Renewal date" type="date" value={form.renewalDate} onChange={(e) => set('renewalDate', e.target.value)} className="input" />
            <input placeholder="Beneficiary" value={form.beneficiary} onChange={(e) => set('beneficiary', e.target.value)} className="input" />
            <input placeholder="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="bg-white text-black text-sm px-4 py-2 rounded-lg font-medium hover:bg-gray-100">Save</button>
            <button onClick={reset} className="text-gray-400 text-sm px-4 py-2 rounded-lg hover:text-white">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full border border-dashed border-gray-700 rounded-xl py-3 text-sm text-gray-500 hover:text-white hover:border-gray-500 transition-colors">
          + Add policy
        </button>
      )}
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

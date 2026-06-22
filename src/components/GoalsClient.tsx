'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Goal = {
  id: string; name: string; category: string; targetAmount: number
  currentAmount: number; targetDate: string | null; notes: string | null
  completed: boolean; createdAt: string; updatedAt: string
}
type Form = {
  name: string; category: string; targetAmount: string
  currentAmount: string; targetDate: string; notes: string
}

const CATEGORIES = ['Emergency Fund', 'Debt Payoff', 'Investment', 'Home', 'Retirement', 'Education', 'Other']
const EMPTY: Form = { name: '', category: 'Emergency Fund', targetAmount: '', currentAmount: '', targetDate: '', notes: '' }

const CATEGORY_COLORS: Record<string, string> = {
  'Emergency Fund': 'bg-blue-900 text-blue-300',
  'Debt Payoff':    'bg-red-900 text-red-300',
  'Investment':     'bg-green-900 text-green-300',
  'Home':           'bg-orange-900 text-orange-300',
  'Retirement':     'bg-purple-900 text-purple-300',
  'Education':      'bg-yellow-900 text-yellow-300',
  'Other':          'bg-gray-800 text-gray-300',
}

export default function GoalsClient({ initial }: { initial: Goal[] }) {
  const [goals, setGoals] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const router = useRouter()

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const reset = () => { setForm(EMPTY); setAdding(false); setEditing(null) }

  const save = async () => {
    if (!form.name || !form.targetAmount) return
    const body = { ...form, targetAmount: parseFloat(form.targetAmount), currentAmount: parseFloat(form.currentAmount || '0') }
    if (editing) {
      await fetch(`/api/goals/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setGoals(goals.map((g) => g.id === editing ? { ...g, ...body, targetAmount: body.targetAmount, currentAmount: body.currentAmount } : g))
    } else {
      const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setGoals([await res.json(), ...goals])
    }
    reset(); router.refresh()
  }

  const remove = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    setGoals(goals.filter((g) => g.id !== id)); router.refresh()
  }

  const toggleComplete = async (g: Goal) => {
    await fetch(`/api/goals/${g.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...g, completed: !g.completed }),
    })
    setGoals(goals.map((x) => x.id === g.id ? { ...x, completed: !x.completed } : x))
    router.refresh()
  }

  const startEdit = (g: Goal) => {
    setForm({ name: g.name, category: g.category, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount), targetDate: g.targetDate ? g.targetDate.split('T')[0] : '', notes: g.notes ?? '' })
    setEditing(g.id); setAdding(true)
  }

  const active    = goals.filter((g) => !g.completed)
  const completed = goals.filter((g) => g.completed)

  const totalTarget  = active.reduce((s, g) => s + g.targetAmount, 0)
  const totalCurrent = active.reduce((s, g) => s + g.currentAmount, 0)

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Active Goals</p>
            <p className="text-2xl font-semibold mt-1">{active.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Target</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalTarget)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Saved So Far</p>
            <p className="text-2xl font-semibold text-green-400 mt-1">{fmt(totalCurrent)}</p>
          </div>
        </div>
      )}

      {active.map((g) => {
        const pct = Math.min(100, g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0)
        const remaining = g.targetAmount - g.currentAmount
        return (
          <div key={g.id} className="bg-gray-900 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold">{g.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[g.category] ?? CATEGORY_COLORS.Other}`}>
                    {g.category}
                  </span>
                </div>
                {g.targetDate && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Target date: {new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="flex gap-3 text-xs ml-4">
                <button onClick={() => startEdit(g)} className="text-gray-500 hover:text-white">Edit</button>
                <button onClick={() => toggleComplete(g)} className="text-green-500 hover:text-green-300">Complete</button>
                <button onClick={() => remove(g.id)} className="text-red-500 hover:text-red-300">Remove</button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{fmt(g.currentAmount)} saved</span>
                <span className="font-medium">{fmt(g.targetAmount)} goal</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : pct >= 75 ? '#3b82f6' : pct >= 50 ? '#f59e0b' : '#6b7280' }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{pct.toFixed(0)}% complete</span>
                <span>{fmt(remaining)} remaining</span>
              </div>
            </div>

            {g.notes && <p className="text-xs text-gray-500">{g.notes}</p>}
          </div>
        )
      })}

      {adding ? (
        <div className="bg-gray-900 rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium">{editing ? 'Edit Goal' : 'New Goal'}</p>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Goal name" value={form.name} onChange={(e) => set('name', e.target.value)} className="col-span-2 input" />
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Target date (optional)" type="date" value={form.targetDate} onChange={(e) => set('targetDate', e.target.value)} className="input" />
            <input placeholder="Goal amount ($)" type="number" value={form.targetAmount} onChange={(e) => set('targetAmount', e.target.value)} className="input" />
            <input placeholder="Current amount ($)" type="number" value={form.currentAmount} onChange={(e) => set('currentAmount', e.target.value)} className="input" />
            <input placeholder="Notes (optional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="col-span-2 input" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="bg-white text-black text-sm px-4 py-2 rounded-lg font-medium hover:bg-gray-100">Save</button>
            <button onClick={reset} className="text-gray-400 text-sm px-4 py-2 rounded-lg hover:text-white">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full border border-dashed border-gray-700 rounded-xl py-3 text-sm text-gray-500 hover:text-white hover:border-gray-500 transition-colors">
          + Add goal
        </button>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Completed ({completed.length})</p>
          {completed.map((g) => (
            <div key={g.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center opacity-50">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-sm">✓</span>
                <p className="text-sm font-medium line-through">{g.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-400">{fmt(g.targetAmount)}</p>
                <button onClick={() => remove(g.id)} className="text-xs text-red-500 hover:text-red-300">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

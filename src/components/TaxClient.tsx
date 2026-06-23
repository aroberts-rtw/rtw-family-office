'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Payment = {
  id: string; quarter: number; dueDate: string
  amountDue: number | null; amountPaid: number | null
  paidDate: string | null; method: string | null
}
type TaxYear = {
  id: string; year: number; filingStatus: string
  priorYearTax: number | null; estimatedIncome: number | null
  estimatedDeductions: number | null; notes: string | null
  payments: Payment[]
}

const FILING_STATUSES = ['MFJ', 'MFS', 'Single', 'HOH']
const QUARTER_LABELS = ['', 'Q1 (Jan–Mar)', 'Q2 (Apr–May)', 'Q3 (Jun–Aug)', 'Q4 (Sep–Dec)']
const METHODS = ['EFTPS', 'Check', 'IRS Direct Pay', 'State Portal', 'Other']

export default function TaxClient({ initial, year }: { initial: TaxYear | null; year: number }) {
  const [data, setData]       = useState(initial)
  const [editing, setEditing] = useState(!initial)
  const [saving, setSaving]   = useState(false)
  const [payEdit, setPayEdit] = useState<string | null>(null)
  const [payForm, setPayForm] = useState({ amountPaid: '', paidDate: '', method: 'EFTPS' })
  const router = useRouter()

  const [form, setForm] = useState({
    filingStatus:          initial?.filingStatus          ?? 'MFJ',
    priorYearTax:          initial?.priorYearTax?.toString()          ?? '',
    estimatedIncome:       initial?.estimatedIncome?.toString()       ?? '',
    estimatedDeductions:   initial?.estimatedDeductions?.toString()   ?? '',
    notes:                 initial?.notes                 ?? '',
  })
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const saveSetup = async () => {
    setSaving(true)
    const res = await fetch('/api/tax', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, ...form }),
    })
    const updated = await res.json()
    setData({ ...updated, payments: updated.payments.map((p: Payment) => ({ ...p })) })
    setEditing(false); setSaving(false); router.refresh()
  }

  const savePayment = async (paymentId: string) => {
    const res = await fetch(`/api/tax/payment/${paymentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payForm),
    })
    const updated = await res.json()
    setData((d) => d ? { ...d, payments: d.payments.map((p) => p.id === paymentId ? { ...p, ...updated } : p) } : d)
    setPayEdit(null); setPayForm({ amountPaid: '', paidDate: '', method: 'EFTPS' })
    router.refresh()
  }

  const startPayEdit = (p: Payment) => {
    setPayForm({ amountPaid: p.amountPaid?.toString() ?? '', paidDate: p.paidDate ? p.paidDate.split('T')[0] : '', method: p.method ?? 'EFTPS' })
    setPayEdit(p.id)
  }

  // Derived calculations
  const priorYearTax     = parseFloat(form.priorYearTax     || '0')
  const estimatedIncome  = parseFloat(form.estimatedIncome  || '0')
  const estimatedDeds    = parseFloat(form.estimatedDeductions || '0')
  const isHighIncome     = estimatedIncome > 150000
  const safeHarborPct    = isHighIncome ? 1.1 : 1.0
  const safeHarbor       = priorYearTax * safeHarborPct
  const quarterlyTarget  = safeHarbor / 4

  const totalPaid  = (data?.payments ?? []).reduce((s, p) => s + (p.amountPaid ?? 0), 0)
  const totalDue   = (data?.payments ?? []).reduce((s, p) => s + (p.amountDue ?? 0), 0)
  const remaining  = Math.max(0, totalDue - totalPaid)

  const now = new Date()

  return (
    <div className="space-y-6">
      {/* Setup card */}
      <div className="bg-gray-900 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{year} Tax Year Setup</p>
          {!editing && <button onClick={() => setEditing(true)} className="text-xs text-blue-400 hover:text-blue-200">Edit</button>}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Filing Status</label>
                <select value={form.filingStatus} onChange={(e) => set('filingStatus', e.target.value)} className="input">
                  {FILING_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Prior Year Tax (line 24)</label>
                <input type="number" placeholder="e.g. 45000" value={form.priorYearTax} onChange={(e) => set('priorYearTax', e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Estimated {year} Income</label>
                <input type="number" placeholder="Total gross income" value={form.estimatedIncome} onChange={(e) => set('estimatedIncome', e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Estimated Deductions</label>
                <input type="number" placeholder="Business expenses, etc." value={form.estimatedDeductions} onChange={(e) => set('estimatedDeductions', e.target.value)} className="input" />
              </div>
              <input placeholder="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="col-span-2 input" />
            </div>
            {priorYearTax > 0 && (
              <div className="bg-blue-950 border border-blue-800 rounded-lg p-3 text-xs space-y-1">
                <p className="text-blue-300 font-medium">Safe Harbor Calculation</p>
                <p className="text-gray-300">Prior year tax: {fmt(priorYearTax)} × {isHighIncome ? '110%' : '100%'} = <span className="text-white font-semibold">{fmt(safeHarbor)}</span></p>
                <p className="text-gray-300">Quarterly target: <span className="text-white font-semibold">{fmt(quarterlyTarget)}</span>/quarter</p>
                {isHighIncome && <p className="text-yellow-400">⚠ Income &gt; $150K — 110% safe harbor applies</p>}
              </div>
            )}
            <button onClick={saveSetup} disabled={saving} className="bg-white text-black text-sm px-4 py-2 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save & Generate Payment Schedule'}
            </button>
          </div>
        ) : data ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Filing Status</p>
              <p className="text-sm font-medium mt-0.5">{data.filingStatus}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Prior Year Tax</p>
              <p className="text-sm font-medium mt-0.5">{data.priorYearTax ? fmt(data.priorYearTax) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Est. Income</p>
              <p className="text-sm font-medium mt-0.5">{data.estimatedIncome ? fmt(data.estimatedIncome) : '—'}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Enter last year's tax liability to auto-calculate safe harbor quarterly payments.</p>
        )}
      </div>

      {/* Summary */}
      {data && data.payments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Due (Safe Harbor)</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalDue)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Paid YTD</p>
            <p className="text-2xl font-semibold text-green-400 mt-1">{fmt(totalPaid)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Remaining</p>
            <p className={`text-2xl font-semibold mt-1 ${remaining > 0 ? 'text-red-400' : 'text-green-400'}`}>{fmt(remaining)}</p>
          </div>
        </div>
      )}

      {/* Payment schedule */}
      {data && data.payments.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Payment Schedule</p>
          {data.payments.map((p) => {
            const due     = new Date(p.dueDate)
            const isPast  = due < now
            const isPaid  = (p.amountPaid ?? 0) > 0
            const isNext  = !isPaid && !isPast
            return (
              <div key={p.id} className={`bg-gray-900 rounded-xl p-4 border ${isPaid ? 'border-green-900' : isPast ? 'border-red-900' : isNext ? 'border-blue-800' : 'border-gray-800'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Q{p.quarter} — {QUARTER_LABELS[p.quarter]}</p>
                      {isPaid && <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">Paid</span>}
                      {!isPaid && isPast && <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">Overdue</span>}
                      {isNext && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">Next</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Due: {due.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    {p.amountDue && <p className="text-sm font-semibold">{fmt(p.amountDue)}</p>}
                    {isPaid && p.amountPaid && <p className="text-xs text-green-400">Paid {fmt(p.amountPaid)}</p>}
                  </div>
                </div>

                {payEdit === p.id ? (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="Amount paid" value={payForm.amountPaid} onChange={(e) => setPayForm((f) => ({ ...f, amountPaid: e.target.value }))} className="input text-xs" />
                      <input type="date" value={payForm.paidDate} onChange={(e) => setPayForm((f) => ({ ...f, paidDate: e.target.value }))} className="input text-xs" />
                      <select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))} className="input text-xs">
                        {METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => savePayment(p.id)} className="bg-white text-black text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100">Save</button>
                      <button onClick={() => setPayEdit(null)} className="text-gray-400 text-xs px-3 py-1.5 hover:text-white">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startPayEdit(p)} className="mt-2 text-xs text-blue-400 hover:text-blue-200">
                    {isPaid ? 'Edit payment' : 'Record payment'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* S-Corp note */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-1.5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">S-Corp Reminders</p>
        <p className="text-xs text-gray-500">• S-corp return (1120-S) due <span className="text-white">March 15</span> — extend to Sep 15 if needed</p>
        <p className="text-xs text-gray-500">• Reasonable salary must be paid before taking distributions — run payroll consistently</p>
        <p className="text-xs text-gray-500">• QBI deduction (§199A): 20% of qualified business income — verify you qualify at current income</p>
        <p className="text-xs text-gray-500">• Georgia state estimated tax due same quarters as federal</p>
      </div>
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

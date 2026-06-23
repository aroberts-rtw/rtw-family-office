'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type Account  = { id: string; name: string; institution: string; currentBalance: number; holdingCount: number }
type Holding  = {
  id: string; securityId: string; institutionSecId: string | null
  quantity: number; institutionValue: number; costBasis: number | null
  accountName: string; institution: string
}

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6b7280']

function ticker(h: Holding) {
  return h.institutionSecId ?? h.securityId?.slice(0, 8) ?? '—'
}

function pnl(h: Holding) {
  if (h.costBasis == null) return null
  return h.institutionValue - h.costBasis
}

export default function HoldingsClient({
  accounts, holdings, totalValue,
}: { accounts: Account[]; holdings: Holding[]; totalValue: number }) {
  const [view, setView]       = useState<'holdings' | 'allocation'>('holdings')
  const [acctFilter, setAcct] = useState<string>('all')

  const visible = acctFilter === 'all' ? holdings : holdings.filter((h) => h.accountName === acctFilter)

  // Allocation by security for pie chart (top 9 + Other)
  const pieData = useMemo(() => {
    const sorted = [...holdings].sort((a, b) => b.institutionValue - a.institutionValue)
    const top    = sorted.slice(0, 9)
    const rest   = sorted.slice(9).reduce((s, h) => s + h.institutionValue, 0)
    const slices = top.map((h) => ({ name: ticker(h), value: h.institutionValue }))
    if (rest > 0) slices.push({ name: 'Other', value: rest })
    return slices
  }, [holdings])

  const totalUnrealized = holdings.reduce((s, h) => {
    const g = pnl(h)
    return g != null ? s + g : s
  }, 0)
  const hasPnl = holdings.some((h) => h.costBasis != null)

  function fmt(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
  }

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Portfolio Value</p>
          <p className="text-2xl font-semibold mt-1">{fmt(totalValue)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Positions</p>
          <p className="text-2xl font-semibold mt-1">{holdings.length}</p>
        </div>
        {hasPnl && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Unrealized P&L</p>
            <p className={`text-2xl font-semibold mt-1 ${totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalUnrealized >= 0 ? '+' : ''}{fmt(totalUnrealized)}
            </p>
          </div>
        )}
      </div>

      {/* View toggle + account filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['holdings', 'allocation'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${view === v ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {v === 'allocation' ? 'Allocation' : 'Holdings'}
            </button>
          ))}
        </div>
        {accounts.length > 1 && (
          <select value={acctFilter} onChange={(e) => setAcct(e.target.value)} className="input text-sm w-auto">
            <option value="all">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
        )}
      </div>

      {/* Holdings table */}
      {view === 'holdings' && (
        <div className="space-y-1">
          {visible.length === 0 && (
            <p className="text-sm text-gray-500">No holdings synced yet. Hit Sync on the Overview page.</p>
          )}
          {visible.map((h) => {
            const gain = pnl(h)
            const weight = totalValue > 0 ? ((h.institutionValue / totalValue) * 100).toFixed(1) : '0'
            return (
              <div key={h.id} className="bg-gray-900 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                    {ticker(h).slice(0, 4)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ticker(h)}</p>
                    <p className="text-xs text-gray-500">{h.accountName} · {h.quantity % 1 === 0 ? h.quantity : h.quantity.toFixed(4)} shares</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{fmt(h.institutionValue)}</p>
                  <div className="flex items-center gap-2 justify-end mt-0.5">
                    <span className="text-xs text-gray-500">{weight}%</span>
                    {gain != null && (
                      <span className={`text-xs ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{fmt(gain)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Allocation pie */}
      {view === 'allocation' && pieData.length > 0 && (
        <div className="grid grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [fmt(Number(v)), '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm">{d.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{fmt(d.value)}</span>
                  <span className="text-xs text-gray-500 ml-2">{((d.value / totalValue) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-account summary */}
      {accounts.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">By Account</p>
          {accounts.map((a) => (
            <div key={a.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-gray-500">{a.institution} · {a.holdingCount} positions</p>
              </div>
              <p className="text-sm font-semibold">{fmt(a.currentBalance)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

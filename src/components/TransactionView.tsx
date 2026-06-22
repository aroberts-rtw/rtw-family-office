'use client'

import { useState, useMemo } from 'react'

type Tx = {
  id: string; name: string; merchantName: string | null
  amount: number; date: string; category: string[]
  pending: boolean; accountName: string; institution: string
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food and Drink':    'bg-orange-500',
  'Travel':            'bg-blue-500',
  'Shops':             'bg-purple-500',
  'Recreation':        'bg-green-500',
  'Service':           'bg-yellow-500',
  'Healthcare':        'bg-red-500',
  'Transfer':          'bg-gray-500',
  'Payment':           'bg-teal-500',
  'Bank Fees':         'bg-pink-500',
  'Entertainment':     'bg-indigo-500',
  'Community':         'bg-lime-500',
  'Cash Advance':      'bg-rose-500',
  'Interest':          'bg-amber-500',
  'Tax':               'bg-cyan-500',
  'Income':            'bg-emerald-500',
}

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-gray-600'
}

function topCategory(cats: string[]) {
  return cats?.[0] ?? 'Uncategorized'
}

export default function TransactionView({ transactions }: { transactions: Tx[] }) {
  const [view, setView] = useState<'category' | 'date'>('category')
  const [expanded, setExpanded] = useState<string | null>(null)

  const charges = transactions.filter((tx) => tx.amount > 0)
  const totalSpent = charges.reduce((s, tx) => s + tx.amount, 0)
  const totalIn = transactions.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)

  const byCategory = useMemo(() => {
    const map: Record<string, { total: number; txs: Tx[] }> = {}
    for (const tx of charges) {
      const cat = topCategory(tx.category)
      if (!map[cat]) map[cat] = { total: 0, txs: [] }
      map[cat].total += tx.amount
      map[cat].txs.push(tx)
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [transactions])

  const toggle = (cat: string) => setExpanded(expanded === cat ? null : cat)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Spent</p>
          <p className="text-2xl font-semibold text-red-400 mt-1">{fmt(totalSpent)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{charges.length} transactions</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total In</p>
          <p className="text-2xl font-semibold text-green-400 mt-1">{fmt(totalIn)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{transactions.filter(t => t.amount < 0).length} transactions</p>
        </div>
      </div>

      {/* Spending bar */}
      {totalSpent > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Spending breakdown</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            {byCategory.map(([cat, { total }]) => (
              <div
                key={cat}
                className={`${categoryColor(cat)} transition-all`}
                style={{ width: `${(total / totalSpent) * 100}%` }}
                title={`${cat}: ${fmt(total)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {byCategory.map(([cat, { total }]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${categoryColor(cat)}`} />
                <span className="text-xs text-gray-400">{cat}</span>
                <span className="text-xs text-gray-500">{fmt(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View toggle */}
      <div className="flex gap-2">
        {(['category', 'date'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${view === v ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {v === 'category' ? 'By Category' : 'By Date'}
          </button>
        ))}
      </div>

      {/* Category view */}
      {view === 'category' && (
        <div className="space-y-2">
          {byCategory.map(([cat, { total, txs }]) => (
            <div key={cat} className="rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(cat)}
                className="w-full flex items-center justify-between bg-gray-900 px-4 py-3 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${categoryColor(cat)}`} />
                  <span className="text-sm font-medium">{cat}</span>
                  <span className="text-xs text-gray-500">{txs.length} transactions</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-400">{fmt(total)}</span>
                  <span className="text-xs text-gray-600">{expanded === cat ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded === cat && (
                <div className="border-t border-gray-800 divide-y divide-gray-800">
                  {txs.map((tx) => (
                    <div key={tx.id} className="bg-gray-900 px-4 py-2.5 flex justify-between items-center pl-10">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{tx.merchantName ?? tx.name}</p>
                        <p className="text-xs text-gray-500">{tx.institution} · {fmtDate(tx.date)}</p>
                      </div>
                      <div className="ml-4 text-right shrink-0">
                        <p className="text-sm font-medium text-red-400">{fmt(tx.amount)}</p>
                        {tx.pending && <p className="text-xs text-yellow-500">Pending</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Date view */}
      {view === 'date' && (
        <div className="space-y-1">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${categoryColor(topCategory(tx.category))}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tx.merchantName ?? tx.name}</p>
                  <p className="text-xs text-gray-500">{topCategory(tx.category)} · {tx.institution} · {fmtDate(tx.date)}</p>
                </div>
              </div>
              <div className="ml-4 text-right shrink-0">
                <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {tx.amount > 0 ? '-' : '+'}{fmt(Math.abs(tx.amount))}
                </p>
                {tx.pending && <p className="text-xs text-yellow-500">Pending</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

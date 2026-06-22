'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ManualAssets from './ManualAssets'

type Acct = {
  id: string; name: string; type: string; subtype: string | null
  mask: string | null; currentBalance: number | null; availableBalance: number | null
}
type Item = {
  id: string; institutionName: string; isBusinessAccount: boolean; accounts: Acct[]
}
type ManualAsset = {
  id: string; name: string; category: string; value: number; notes: string | null
  address: string | null; vehicleYear: number | null; vehicleMake: string | null
  vehicleModel: string | null; vehicleTrim: string | null; vehicleMileage: number | null
  zipCode: string | null; lastRefreshed: Date | null
}

const ACCT_CATEGORIES = [
  { label: 'Cash & Banking', types: ['depository'], asset: true },
  { label: 'Investments',    types: ['investment'], asset: true },
  { label: 'Credit Cards',   types: ['credit'],     asset: false },
  { label: 'Loans',          types: ['loan'],        asset: false },
  { label: 'Other',          types: ['other'],       asset: true },
]

function categorize(accounts: Acct[]) {
  const map: Record<string, Acct[]> = Object.fromEntries(ACCT_CATEGORIES.map((c) => [c.label, []]))
  for (const a of accounts) {
    const cat = ACCT_CATEGORIES.find((c) => c.types.includes(a.type)) ?? ACCT_CATEGORIES[ACCT_CATEGORIES.length - 1]
    map[cat.label].push(a)
  }
  return map
}

function totals(items: Item[]) {
  let assets = 0, liabilities = 0
  for (const item of items) {
    for (const a of item.accounts) {
      const cat = ACCT_CATEGORIES.find((c) => c.types.includes(a.type))
      if (cat?.asset) assets += a.currentBalance ?? 0
      else liabilities += Math.abs(a.currentBalance ?? 0)
    }
  }
  return { assets, liabilities, net: assets - liabilities }
}

export default function AccountsClient({
  items, manualAssets, manualTotal,
}: { items: Item[]; manualAssets: ManualAsset[]; manualTotal: number }) {
  const [tab, setTab] = useState<'personal' | 'business'>('personal')
  const [localItems, setLocalItems] = useState(items)
  const router = useRouter()

  const personal = localItems.filter((i) => !i.isBusinessAccount)
  const business  = localItems.filter((i) => i.isBusinessAccount)
  const visible   = tab === 'personal' ? personal : business

  const toggleBusiness = async (id: string, current: boolean) => {
    await fetch(`/api/plaid-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBusinessAccount: !current }),
    })
    setLocalItems((prev) => prev.map((i) => i.id === id ? { ...i, isBusinessAccount: !current } : i))
    router.refresh()
  }

  const personalTotals = totals(personal)
  const businessTotals = totals(business)
  const displayTotals  = tab === 'personal' ? personalTotals : businessTotals

  const allAssets     = personalTotals.assets + businessTotals.assets + manualTotal
  const allLiabilities = personalTotals.liabilities + businessTotals.liabilities
  const netWorth      = allAssets - allLiabilities

  return (
    <div className="space-y-6">
      {/* Overall summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 bg-blue-950 border border-blue-800">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Net Worth</p>
          <p className="text-2xl font-semibold mt-2">{fmt(netWorth)}</p>
        </div>
        <div className="rounded-xl p-5 bg-gray-900">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Assets</p>
          <p className="text-2xl font-semibold mt-2">{fmt(allAssets)}</p>
        </div>
        <div className="rounded-xl p-5 bg-gray-900">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Liabilities</p>
          <p className="text-2xl font-semibold text-red-400 mt-2">{fmt(allLiabilities)}</p>
        </div>
      </div>

      {/* Personal / Business tab */}
      <div className="flex gap-2 items-center">
        {(['personal', 'business'] as const).map((t) => {
          const count = t === 'personal' ? personal.length : business.length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {t} {count > 0 && <span className="ml-1 text-xs opacity-60">{count}</span>}
            </button>
          )
        })}
        <span className="text-xs text-gray-600 ml-2">Toggle institutions below to move them</span>
      </div>

      {/* Tab subtotals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Assets</p>
          <p className="text-lg font-semibold mt-0.5">{fmt(displayTotals.assets + (tab === 'personal' ? manualTotal : 0))}</p>
        </div>
        <div className="bg-gray-900 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Liabilities</p>
          <p className="text-lg font-semibold text-red-400 mt-0.5">{fmt(displayTotals.liabilities)}</p>
        </div>
        <div className="bg-gray-900 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Net</p>
          <p className="text-lg font-semibold mt-0.5">{fmt(displayTotals.net + (tab === 'personal' ? manualTotal : 0))}</p>
        </div>
      </div>

      {/* Institution list */}
      {visible.length === 0 ? (
        <p className="text-sm text-gray-500">
          {tab === 'business'
            ? 'No business accounts yet. Connect a business account and toggle it below, or switch an existing institution to Business.'
            : 'No accounts connected yet.'}
        </p>
      ) : (
        visible.map((item) => {
          const buckets = categorize(item.accounts)
          return (
            <div key={item.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">{item.institutionName}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.isBusinessAccount ? 'bg-blue-900 text-blue-300' : 'bg-gray-800 text-gray-400'}`}>
                    {item.isBusinessAccount ? 'Business' : 'Personal'}
                  </span>
                </div>
                <button
                  onClick={() => toggleBusiness(item.id, item.isBusinessAccount)}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Move to {item.isBusinessAccount ? 'Personal' : 'Business'} →
                </button>
              </div>

              {ACCT_CATEGORIES.map((cat) => {
                const accts = buckets[cat.label]
                if (!accts.length) return null
                const catTotal = accts.reduce((s, a) => s + Math.abs(a.currentBalance ?? 0), 0)
                return (
                  <div key={cat.label} className="space-y-1 ml-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{cat.label}</h3>
                      <span className={`text-xs font-medium ${!cat.asset ? 'text-red-400' : 'text-gray-400'}`}>
                        {!cat.asset ? '−' : ''}{fmt(catTotal)}
                      </span>
                    </div>
                    {accts.map((a) => (
                      <div key={a.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {a.subtype ?? a.type}{a.mask ? ` ···${a.mask}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${!cat.asset ? 'text-red-400' : ''}`}>
                            {fmt(Math.abs(a.currentBalance ?? 0))}
                          </p>
                          {a.availableBalance != null && a.availableBalance !== a.currentBalance && (
                            <p className="text-xs text-gray-500">{fmt(a.availableBalance)} avail</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })
      )}

      {/* Manual assets only on personal tab */}
      {tab === 'personal' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Property & Other Assets</h2>
            {manualTotal > 0 && <span className="text-sm font-semibold">{fmt(manualTotal)}</span>}
          </div>
          <ManualAssets initial={manualAssets} />
        </div>
      )}
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

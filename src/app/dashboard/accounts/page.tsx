import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

type Account = Awaited<ReturnType<typeof getAccounts>>[number]

async function getAccounts(userId: string) {
  return db.account.findMany({
    where: { plaidItem: { userId } },
    include: { plaidItem: true },
    orderBy: { currentBalance: 'desc' },
  })
}

const CATEGORIES: { label: string; types: string[]; subtypes?: string[]; asset: boolean }[] = [
  { label: 'Cash & Banking',  types: ['depository'],  asset: true  },
  { label: 'Investments',     types: ['investment'],  asset: true  },
  { label: 'Credit Cards',    types: ['credit'],      asset: false },
  { label: 'Loans',           types: ['loan'],        asset: false },
  { label: 'Other',           types: ['other'],       asset: true  },
]

function categorize(accounts: Account[]) {
  const buckets: Record<string, Account[]> = Object.fromEntries(CATEGORIES.map((c) => [c.label, []]))
  for (const a of accounts) {
    const cat = CATEGORIES.find((c) => c.types.includes(a.type)) ?? CATEGORIES[CATEGORIES.length - 1]
    buckets[cat.label].push(a)
  }
  return buckets
}

function total(accounts: Account[]) {
  return accounts.reduce((sum, a) => sum + Math.abs(a.currentBalance ?? 0), 0)
}

export default async function AccountsPage() {
  const { userId } = await auth()
  const accounts = await getAccounts(userId!)
  const buckets = categorize(accounts)

  const totalAssets = CATEGORIES.filter((c) => c.asset)
    .flatMap((c) => buckets[c.label])
    .reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)

  const totalLiabilities = CATEGORIES.filter((c) => !c.asset)
    .flatMap((c) => buckets[c.label])
    .reduce((sum, a) => sum + Math.abs(a.currentBalance ?? 0), 0)

  const netWorth = totalAssets - totalLiabilities

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
      </div>

      {accounts.length === 0 ? (
        <p className="text-gray-400 text-sm">No accounts connected. Use the Connect Account button on the Overview page.</p>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard label="Net Worth" value={netWorth} highlight />
            <SummaryCard label="Total Assets" value={totalAssets} />
            <SummaryCard label="Total Liabilities" value={totalLiabilities} negative />
          </div>

          {/* Categories */}
          {CATEGORIES.map((cat) => {
            const accts = buckets[cat.label]
            if (accts.length === 0) return null
            const catTotal = total(accts)
            return (
              <div key={cat.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">{cat.label}</h2>
                  <span className={`text-sm font-semibold ${!cat.asset ? 'text-red-400' : ''}`}>
                    {!cat.asset ? '−' : ''}{fmt(catTotal)}
                  </span>
                </div>
                <div className="space-y-1">
                  {accts.map((a) => (
                    <div key={a.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {a.plaidItem.institutionName}
                          {a.subtype ? ` · ${a.subtype}` : ''}
                          {a.mask ? ` ···${a.mask}` : ''}
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
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, highlight, negative }: {
  label: string; value: number; highlight?: boolean; negative?: boolean
}) {
  return (
    <div className={`rounded-xl p-5 ${highlight ? 'bg-blue-950 border border-blue-800' : 'bg-gray-900'}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${negative ? 'text-red-400' : ''}`}>{fmt(value)}</p>
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

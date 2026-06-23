import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import ConnectButton from '@/components/ConnectButton'
import SyncButton from '@/components/SyncButton'
import NetWorthChart from '@/components/NetWorthChart'

export default async function DashboardPage() {
  const { userId } = await auth()

  const [accounts, manualAssets, snapshots] = await Promise.all([
    db.account.findMany({
      where: { plaidItem: { userId: userId! } },
      include: { plaidItem: true },
      orderBy: { currentBalance: 'desc' },
    }),
    db.manualAsset.findMany({ where: { userId: userId! } }),
    db.netWorthSnapshot.findMany({
      orderBy: { date: 'asc' },
      take: 90,
    }),
  ])

  const plaidAssets = accounts
    .filter((a) => ['depository', 'investment', 'other'].includes(a.type))
    .reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)

  const manualTotal = manualAssets.reduce((s, a) => s + a.value, 0)
  const assets      = plaidAssets + manualTotal

  const liabilities = accounts
    .filter((a) => ['credit', 'loan'].includes(a.type))
    .reduce((sum, a) => sum + Math.abs(a.currentBalance ?? 0), 0)

  const netWorth = assets - liabilities

  const chartData = snapshots.map((s) => ({
    date: s.date.toISOString(),
    netWorth: s.netWorth,
    assets: s.assets,
    liabilities: s.liabilities,
  }))

  // Spending summary — last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const recentTx = await db.transaction.findMany({
    where: {
      account: { plaidItem: { userId: userId! } },
      date: { gte: thirtyDaysAgo },
      amount: { gt: 0 },
      pending: false,
    },
    select: { amount: true },
  })
  const spent30 = recentTx.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Roberts Household · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/reports/net-worth"
            className="px-3 py-2 rounded-lg text-sm bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            Export PDF
          </a>
          <SyncButton />
          <ConnectButton />
        </div>
      </div>

      {/* Net worth chart */}
      <NetWorthChart snapshots={chartData} />

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Assets"      value={assets}      />
        <StatCard label="Total Liabilities" value={liabilities} negative />
        <StatCard label="Spent (30d)"       value={spent30}     negative />
        <StatCard label="Accounts"          value={accounts.length} count />
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-xl p-16 text-center">
          <p className="text-gray-400 text-sm mb-4">No accounts connected yet</p>
          <ConnectButton label="Connect your first account" />
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">All Accounts</h2>
          <div className="space-y-1.5">
            {accounts.map((account) => (
              <div key={account.id} className="flex justify-between items-center bg-gray-900 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {account.plaidItem.institutionName} · {account.subtype ?? account.type}
                    {account.mask ? ` ···${account.mask}` : ''}
                  </p>
                </div>
                <p className={`font-semibold text-sm ${['credit', 'loan'].includes(account.type) ? 'text-red-400' : ''}`}>
                  {fmt(Math.abs(account.currentBalance ?? 0))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, negative, count }: {
  label: string; value: number; negative?: boolean; count?: boolean
}) {
  return (
    <div className="rounded-xl p-4 bg-gray-900">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-2 ${negative ? 'text-red-400' : ''}`}>
        {count ? value : fmt(value)}
      </p>
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

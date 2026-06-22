import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import ConnectButton from '@/components/ConnectButton'
import SyncButton from '@/components/SyncButton'

export default async function DashboardPage() {
  const { userId } = await auth()

  const accounts = await db.account.findMany({
    where: { plaidItem: { userId: userId! } },
    include: { plaidItem: true },
    orderBy: { currentBalance: 'desc' },
  })

  const assets = accounts
    .filter((a) => ['depository', 'investment'].includes(a.type))
    .reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)

  const liabilities = accounts
    .filter((a) => ['credit', 'loan'].includes(a.type))
    .reduce((sum, a) => sum + Math.abs(a.currentBalance ?? 0), 0)

  const netWorth = assets - liabilities

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-gray-400 text-sm mt-0.5">Roberts Household · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <ConnectButton />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Net Worth" value={netWorth} highlight />
        <StatCard label="Total Assets" value={assets} />
        <StatCard label="Total Liabilities" value={liabilities} negative />
      </div>

      {accounts.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-xl p-16 text-center">
          <p className="text-gray-400 text-sm mb-4">No accounts connected yet</p>
          <ConnectButton label="Connect your first account" />
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Accounts</h2>
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.id} className="flex justify-between items-center bg-gray-900 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {account.plaidItem.institutionName} · {account.subtype ?? account.type}
                    {account.mask ? ` ···${account.mask}` : ''}
                  </p>
                </div>
                <p className="font-semibold text-sm">
                  {formatCurrency(account.currentBalance ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, highlight, negative }: {
  label: string
  value: number
  highlight?: boolean
  negative?: boolean
}) {
  return (
    <div className={`rounded-xl p-5 ${highlight ? 'bg-blue-950 border border-blue-800' : 'bg-gray-900'}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${negative ? 'text-red-400' : ''}`}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

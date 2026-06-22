import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export default async function TransactionsPage() {
  const { userId } = await auth()

  const transactions = await db.transaction.findMany({
    where: { account: { plaidItem: { userId: userId! } } },
    include: { account: { include: { plaidItem: true } } },
    orderBy: { date: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>

      {transactions.length === 0 ? (
        <p className="text-gray-400 text-sm">No transactions yet. Connect an account and click Sync on the Overview page.</p>
      ) : (
        <div className="space-y-1">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.merchantName ?? tx.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tx.account.plaidItem.institutionName} · {tx.account.name} · {fmtDate(tx.date)}
                </p>
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

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

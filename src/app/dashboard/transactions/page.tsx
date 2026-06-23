import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import TransactionView from '@/components/TransactionView'

export default async function TransactionsPage() {
  const { userId } = await auth()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [transactions, budgets] = await Promise.all([
    db.transaction.findMany({
      where: { account: { plaidItem: { userId: userId! } } },
      include: { account: { include: { plaidItem: true } } },
      orderBy: { date: 'desc' },
      take: 500,
    }),
    db.budget.findMany({ where: { userId: userId! } }),
  ])

  const mtdByCategory: Record<string, number> = {}
  for (const tx of transactions.filter((t) => new Date(t.date) >= startOfMonth && t.amount > 0)) {
    const cat = (tx.category as string[])?.[0] ?? 'Uncategorized'
    mtdByCategory[cat] = (mtdByCategory[cat] ?? 0) + tx.amount
  }

  const serialized = transactions.map((tx) => ({
    id: tx.id, name: tx.name, merchantName: tx.merchantName,
    amount: tx.amount, date: tx.date.toISOString(),
    category: tx.category as string[], pending: tx.pending,
    accountName: tx.account.name, institution: tx.account.plaidItem.institutionName ?? '',
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      {transactions.length === 0 ? (
        <p className="text-gray-400 text-sm">No transactions yet. Hit Sync on the Overview page.</p>
      ) : (
        <TransactionView
          transactions={serialized}
          budgets={Object.fromEntries(budgets.map((b) => [b.category, b.amount]))}
          mtdSpend={mtdByCategory}
        />
      )}
    </div>
  )
}

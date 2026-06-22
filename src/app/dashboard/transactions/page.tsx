import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import TransactionView from '@/components/TransactionView'

export default async function TransactionsPage() {
  const { userId } = await auth()

  const transactions = await db.transaction.findMany({
    where: { account: { plaidItem: { userId: userId! } } },
    include: { account: { include: { plaidItem: true } } },
    orderBy: { date: 'desc' },
    take: 500,
  })

  const serialized = transactions.map((tx) => ({
    id: tx.id,
    name: tx.name,
    merchantName: tx.merchantName,
    amount: tx.amount,
    date: tx.date.toISOString(),
    category: tx.category as string[],
    pending: tx.pending,
    accountName: tx.account.name,
    institution: tx.account.plaidItem.institutionName ?? '',
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      {transactions.length === 0 ? (
        <p className="text-gray-400 text-sm">No transactions yet. Hit Sync on the Overview page.</p>
      ) : (
        <TransactionView transactions={serialized} />
      )}
    </div>
  )
}

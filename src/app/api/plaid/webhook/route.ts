import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { plaidClient } from '@/lib/plaid'
import { Transaction, RemovedTransaction } from 'plaid'

// Plaid sends webhooks for transaction updates — auto-sync when new data arrives
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { webhook_type, webhook_code, item_id } = body

  if (webhook_type !== 'TRANSACTIONS') {
    return NextResponse.json({ received: true })
  }

  // SYNC_UPDATES_AVAILABLE fires when new transactions are ready
  if (webhook_code !== 'SYNC_UPDATES_AVAILABLE') {
    return NextResponse.json({ received: true })
  }

  const item = await db.plaidItem.findUnique({ where: { itemId: item_id } })
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  // Run incremental sync for this specific item
  let cursor = item.cursor ?? undefined
  let added: Transaction[] = []
  let removed: RemovedTransaction[] = []
  let hasMore = true

  while (hasMore) {
    const res = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor,
    })
    added   = [...added,   ...res.data.added]
    removed = [...removed, ...res.data.removed]
    hasMore = res.data.has_more
    cursor  = res.data.next_cursor
  }

  // Upsert added transactions
  for (const tx of added) {
    const account = await db.account.findUnique({ where: { plaidAccountId: tx.account_id } })
    if (!account) continue
    await db.transaction.upsert({
      where: { plaidTransactionId: tx.transaction_id },
      update: {
        amount: tx.amount, date: new Date(tx.date), name: tx.name,
        merchantName: tx.merchant_name ?? null,
        category: tx.category ?? [],
        pending: tx.pending,
      },
      create: {
        accountId: account.id, plaidTransactionId: tx.transaction_id,
        amount: tx.amount, date: new Date(tx.date), name: tx.name,
        merchantName: tx.merchant_name ?? null,
        category: tx.category ?? [],
        pending: tx.pending,
        isoCurrencyCode: tx.iso_currency_code ?? null,
      },
    })
  }

  // Remove deleted transactions
  for (const tx of removed) {
    await db.transaction.deleteMany({ where: { plaidTransactionId: tx.transaction_id } })
  }

  await db.plaidItem.update({ where: { id: item.id }, data: { cursor } })

  return NextResponse.json({ synced: added.length, removed: removed.length })
}

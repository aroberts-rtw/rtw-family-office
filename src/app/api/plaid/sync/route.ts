import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { plaidClient } from '@/lib/plaid'
import { db } from '@/lib/db'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await db.plaidItem.findMany({ where: { userId } })

  for (const item of items) {
    const { data: accountsData } = await plaidClient.accountsGet({
      access_token: item.accessToken,
    })

    for (const acct of accountsData.accounts) {
      await db.account.upsert({
        where: { plaidAccountId: acct.account_id },
        create: {
          plaidItemId: item.id,
          plaidAccountId: acct.account_id,
          name: acct.name,
          officialName: acct.official_name ?? null,
          type: acct.type,
          subtype: acct.subtype ?? null,
          mask: acct.mask ?? null,
          currentBalance: acct.balances.current ?? null,
          availableBalance: acct.balances.available ?? null,
          isoCurrencyCode: acct.balances.iso_currency_code ?? null,
        },
        update: {
          currentBalance: acct.balances.current ?? null,
          availableBalance: acct.balances.available ?? null,
        },
      })
    }

    let cursor = item.cursor ?? undefined
    let hasMore = true

    while (hasMore) {
      const { data: txData } = await plaidClient.transactionsSync({
        access_token: item.accessToken,
        cursor,
      })

      for (const tx of txData.added) {
        const account = await db.account.findUnique({
          where: { plaidAccountId: tx.account_id },
        })
        if (!account) continue

        await db.transaction.upsert({
          where: { plaidTransactionId: tx.transaction_id },
          create: {
            accountId: account.id,
            plaidTransactionId: tx.transaction_id,
            amount: tx.amount,
            date: new Date(tx.date),
            name: tx.name,
            merchantName: tx.merchant_name ?? null,
            category: tx.category ?? [],
            pending: tx.pending,
            isoCurrencyCode: tx.iso_currency_code ?? null,
          },
          update: {
            amount: tx.amount,
            pending: tx.pending,
          },
        })
      }

      for (const tx of txData.modified) {
        await db.transaction.updateMany({
          where: { plaidTransactionId: tx.transaction_id },
          data: { amount: tx.amount, pending: tx.pending },
        })
      }

      for (const tx of txData.removed) {
        await db.transaction.deleteMany({
          where: { plaidTransactionId: tx.transaction_id },
        })
      }

      cursor = txData.next_cursor
      hasMore = txData.has_more
    }

    await db.plaidItem.update({
      where: { id: item.id },
      data: { cursor },
    })
  }

  const allAccounts = await db.account.findMany({
    where: { plaidItem: { userId } },
  })

  const assets = allAccounts
    .filter((a) => ['depository', 'investment'].includes(a.type))
    .reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)

  const liabilities = allAccounts
    .filter((a) => ['credit', 'loan'].includes(a.type))
    .reduce((sum, a) => sum + Math.abs(a.currentBalance ?? 0), 0)

  await db.netWorthSnapshot.create({
    data: {
      assets,
      liabilities,
      netWorth: assets - liabilities,
      breakdown: allAccounts.map((a) => ({
        name: a.name,
        type: a.type,
        balance: a.currentBalance,
      })),
    },
  })

  return NextResponse.json({ success: true })
}

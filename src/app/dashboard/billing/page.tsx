import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

type TxRow = { name: string; merchantName: string | null; amount: number; date: Date }

function detectSubscriptions(txs: TxRow[]) {
  const byMerchant: Record<string, TxRow[]> = {}
  for (const tx of txs) {
    const key = tx.merchantName ?? tx.name
    if (!byMerchant[key]) byMerchant[key] = []
    byMerchant[key].push(tx)
  }

  const subs: { name: string; amount: number; frequency: string; lastCharged: Date; occurrences: number }[] = []

  for (const [name, charges] of Object.entries(byMerchant)) {
    if (charges.length < 2) continue
    // All charges must be within 10% of each other to be "recurring"
    const amounts = charges.map((c) => c.amount)
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
    const allClose = amounts.every((a) => Math.abs(a - avg) / avg < 0.1)
    if (!allClose) continue

    // Estimate frequency from gap between charges
    const sorted = [...charges].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000)
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length

    let frequency = 'Unknown'
    if (avgGap < 10)        frequency = 'Weekly'
    else if (avgGap < 35)   frequency = 'Monthly'
    else if (avgGap < 100)  frequency = 'Quarterly'
    else                    frequency = 'Annual'

    subs.push({
      name,
      amount: parseFloat(avg.toFixed(2)),
      frequency,
      lastCharged: new Date(sorted[sorted.length - 1].date),
      occurrences: charges.length,
    })
  }

  return subs.sort((a, b) => b.amount - a.amount)
}

export default async function BillingPage() {
  const { userId } = await auth()

  const transactions = await db.transaction.findMany({
    where: {
      account: { plaidItem: { userId: userId! } },
      amount: { gt: 0 },
      pending: false,
      date: { gte: new Date(Date.now() - 180 * 86400000) },
    },
    select: { name: true, merchantName: true, amount: true, date: true },
    orderBy: { date: 'desc' },
  })

  const subs = detectSubscriptions(transactions)
  const monthlyTotal = subs.reduce((s, sub) => {
    if (sub.frequency === 'Weekly')    return s + sub.amount * 4.33
    if (sub.frequency === 'Monthly')   return s + sub.amount
    if (sub.frequency === 'Quarterly') return s + sub.amount / 3
    if (sub.frequency === 'Annual')    return s + sub.amount / 12
    return s
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Monthly Billing</h1>
        <p className="text-sm text-gray-400">Recurring charges detected from last 180 days</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Est. Monthly</p>
          <p className="text-2xl font-semibold text-red-400 mt-1">{fmt(monthlyTotal)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Est. Annual</p>
          <p className="text-2xl font-semibold mt-1">{fmt(monthlyTotal * 12)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Subscriptions</p>
          <p className="text-2xl font-semibold mt-1">{subs.length}</p>
        </div>
      </div>

      {subs.length === 0 ? (
        <p className="text-sm text-gray-400">No recurring charges detected yet. Sync more transactions first.</p>
      ) : (
        <div className="space-y-1">
          {(['Monthly', 'Annual', 'Quarterly', 'Weekly', 'Unknown'] as const).map((freq) => {
            const group = subs.filter((s) => s.frequency === freq)
            if (!group.length) return null
            return (
              <div key={freq} className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-3 pb-1">{freq}</p>
                {group.map((sub) => (
                  <div key={sub.name} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{sub.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last charged {sub.lastCharged.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {sub.occurrences} occurrences
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-400">{fmt(sub.amount)}</p>
                      <p className="text-xs text-gray-500">{fmtMonthly(sub)} /mo</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function fmtMonthly(sub: { amount: number; frequency: string }) {
  let monthly = sub.amount
  if (sub.frequency === 'Weekly')    monthly = sub.amount * 4.33
  if (sub.frequency === 'Quarterly') monthly = sub.amount / 3
  if (sub.frequency === 'Annual')    monthly = sub.amount / 12
  return fmt(monthly)
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

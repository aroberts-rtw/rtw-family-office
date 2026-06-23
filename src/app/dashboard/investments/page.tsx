import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import HoldingsClient from '@/components/HoldingsClient'

export default async function InvestmentsPage() {
  const { userId } = await auth()

  const accounts = await db.account.findMany({
    where: { plaidItem: { userId: userId! }, type: 'investment' },
    include: {
      plaidItem: true,
      holdings: { orderBy: { institutionValue: 'desc' } },
    },
  })

  const totalValue = accounts.reduce(
    (s, a) => s + a.holdings.reduce((hs, h) => hs + h.institutionValue, 0),
    0,
  )

  const allHoldings = accounts.flatMap((a) =>
    a.holdings.map((h) => ({
      id: h.id,
      securityId: h.securityId,
      institutionSecId: h.institutionSecId ?? null,
      quantity: h.quantity,
      institutionValue: h.institutionValue,
      costBasis: h.costBasis ?? null,
      accountName: a.name,
      institution: a.plaidItem.institutionName ?? '',
    })),
  )

  const serializedAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    institution: a.plaidItem.institutionName ?? '',
    currentBalance: a.currentBalance ?? 0,
    holdingCount: a.holdings.length,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Investments</h1>
        {totalValue > 0 && (
          <p className="text-sm text-gray-400">
            Total portfolio: <span className="text-white font-semibold">{fmt(totalValue)}</span>
          </p>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center space-y-2">
          <p className="text-gray-300 text-sm font-medium">No investment accounts connected</p>
          <p className="text-gray-500 text-xs">Connect a brokerage (Fidelity, Schwab, Vanguard) from the Overview page.</p>
        </div>
      ) : (
        <HoldingsClient accounts={serializedAccounts} holdings={allHoldings} totalValue={totalValue} />
      )}
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

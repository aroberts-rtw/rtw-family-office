import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export default async function AccountsPage() {
  const { userId } = await auth()

  const accounts = await db.account.findMany({
    where: { plaidItem: { userId: userId! } },
    include: { plaidItem: true },
    orderBy: { type: 'asc' },
  })

  const byInstitution = accounts.reduce<Record<string, typeof accounts>>((acc, a) => {
    const key = a.plaidItem.institutionName ?? 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Accounts</h1>

      {accounts.length === 0 ? (
        <p className="text-gray-400 text-sm">No accounts connected. Use the Connect Account button on the Overview page.</p>
      ) : (
        Object.entries(byInstitution).map(([institution, accts]) => (
          <div key={institution} className="space-y-2">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">{institution}</h2>
            <div className="space-y-2">
              {accts.map((a) => (
                <div key={a.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.subtype ?? a.type}{a.mask ? ` ···${a.mask}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(a.currentBalance ?? 0)}</p>
                    {a.availableBalance != null && a.availableBalance !== a.currentBalance && (
                      <p className="text-xs text-gray-500">{fmt(a.availableBalance)} available</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

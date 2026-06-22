import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import ManualAssets from '@/components/ManualAssets'
import AccountsClient from '@/components/AccountsClient'

export default async function AccountsPage() {
  const { userId } = await auth()

  const [plaidItems, manualAssets] = await Promise.all([
    db.plaidItem.findMany({
      where: { userId: userId! },
      include: { accounts: { orderBy: { currentBalance: 'desc' } } },
      orderBy: { institutionName: 'asc' },
    }),
    db.manualAsset.findMany({ where: { userId: userId! }, orderBy: { category: 'asc' } }),
  ])

  const manualTotal = manualAssets.reduce((s, a) => s + a.value, 0)

  const serialized = plaidItems.map((item) => ({
    id: item.id,
    institutionName: item.institutionName ?? 'Unknown',
    isBusinessAccount: item.isBusinessAccount,
    accounts: item.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      mask: a.mask,
      currentBalance: a.currentBalance,
      availableBalance: a.availableBalance,
    })),
  }))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Accounts</h1>
      <AccountsClient items={serialized} manualAssets={manualAssets} manualTotal={manualTotal} />
    </div>
  )
}

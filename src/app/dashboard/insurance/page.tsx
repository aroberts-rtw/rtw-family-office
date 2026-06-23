import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import InsuranceClient from '@/components/InsuranceClient'

export default async function InsurancePage() {
  const { userId } = await auth()
  const policies = await db.insurancePolicy.findMany({
    where: { userId: userId! },
    orderBy: { type: 'asc' },
  })
  const serialized = policies.map((p) => ({
    ...p,
    renewalDate: p.renewalDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Insurance</h1>
      <InsuranceClient initial={serialized} />
    </div>
  )
}

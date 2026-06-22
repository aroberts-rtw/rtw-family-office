import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import GoalsClient from '@/components/GoalsClient'

export default async function GoalsPage() {
  const { userId } = await auth()
  const goals = await db.goal.findMany({ where: { userId: userId! }, orderBy: { createdAt: 'desc' } })
  const serialized = goals.map((g) => ({
    ...g,
    targetDate: g.targetDate?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <GoalsClient initial={serialized} />
    </div>
  )
}

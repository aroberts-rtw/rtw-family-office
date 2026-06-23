import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import TaxClient from '@/components/TaxClient'

export default async function TaxPage() {
  const { userId } = await auth()
  const year = new Date().getFullYear()

  const taxYear = await db.taxYear.findUnique({
    where: { userId_year: { userId: userId!, year } },
    include: { payments: { orderBy: { quarter: 'asc' } } },
  })

  const serialized = taxYear ? {
    ...taxYear,
    createdAt: taxYear.createdAt.toISOString(),
    updatedAt: taxYear.updatedAt.toISOString(),
    payments: taxYear.payments.map((p) => ({
      ...p,
      dueDate:   p.dueDate.toISOString(),
      paidDate:  p.paidDate?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  } : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tax</h1>
      <TaxClient initial={serialized} year={year} />
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { amountPaid, paidDate, method } = await req.json()

  // Verify ownership via taxYear
  const payment = await db.taxPayment.findFirst({
    where: { id },
    include: { taxYear: true },
  })
  if (!payment || payment.taxYear.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await db.taxPayment.update({
    where: { id },
    data: {
      amountPaid: amountPaid ? parseFloat(amountPaid) : null,
      paidDate: paidDate ? new Date(paidDate) : null,
      method,
    },
  })
  return NextResponse.json(updated)
}

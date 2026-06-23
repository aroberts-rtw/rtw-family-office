import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { type, carrier, policyNumber, coverageAmount, annualPremium, renewalDate, beneficiary, notes } = await req.json()
  await db.insurancePolicy.updateMany({
    where: { id, userId },
    data: {
      type, carrier, policyNumber, notes, beneficiary,
      coverageAmount: coverageAmount ? parseFloat(coverageAmount) : null,
      annualPremium: parseFloat(annualPremium),
      renewalDate: renewalDate ? new Date(renewalDate) : null,
    },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.insurancePolicy.deleteMany({ where: { id, userId } })
  return NextResponse.json({ success: true })
}

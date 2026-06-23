import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const policies = await db.insurancePolicy.findMany({ where: { userId }, orderBy: { type: 'asc' } })
  return NextResponse.json(policies)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { type, carrier, policyNumber, coverageAmount, annualPremium, renewalDate, beneficiary, notes } = await req.json()
  const policy = await db.insurancePolicy.create({
    data: {
      userId, type, carrier, policyNumber, notes, beneficiary,
      coverageAmount: coverageAmount ? parseFloat(coverageAmount) : null,
      annualPremium: parseFloat(annualPremium),
      renewalDate: renewalDate ? new Date(renewalDate) : null,
    },
  })
  return NextResponse.json(policy)
}

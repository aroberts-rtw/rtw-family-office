import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const budgets = await db.budget.findMany({ where: { userId } })
  return NextResponse.json(budgets)
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { category, amount } = await req.json()
  const budget = await db.budget.upsert({
    where: { userId_category: { userId, category } },
    update: { amount: parseFloat(amount) },
    create: { userId, category, amount: parseFloat(amount) },
  })
  return NextResponse.json(budget)
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { category } = await req.json()
  await db.budget.deleteMany({ where: { userId, category } })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const goals = await db.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, targetAmount, currentAmount, targetDate, category, notes } = await req.json()
  const goal = await db.goal.create({
    data: {
      userId, name, category, notes,
      targetAmount: parseFloat(targetAmount),
      currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
      targetDate: targetDate ? new Date(targetDate) : null,
    },
  })
  return NextResponse.json(goal)
}

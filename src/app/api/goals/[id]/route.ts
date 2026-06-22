import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { name, targetAmount, currentAmount, targetDate, category, notes, completed } = await req.json()
  await db.goal.updateMany({
    where: { id, userId },
    data: {
      name, category, notes, completed: !!completed,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount ?? 0),
      targetDate: targetDate ? new Date(targetDate) : null,
    },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.goal.deleteMany({ where: { id, userId } })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, category, value, notes } = await req.json()
  const asset = await db.manualAsset.updateMany({
    where: { id: params.id, userId },
    data: { name, category, value: parseFloat(value), notes },
  })
  return NextResponse.json(asset)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.manualAsset.deleteMany({ where: { id: params.id, userId } })
  return NextResponse.json({ success: true })
}

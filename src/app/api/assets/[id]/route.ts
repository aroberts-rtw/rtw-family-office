import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { name, category, value, notes, address, vehicleYear, vehicleMake, vehicleModel, vehicleTrim, vehicleMileage, zipCode } = await req.json()
  const asset = await db.manualAsset.updateMany({
    where: { id, userId },
    data: { name, category, value: parseFloat(value), notes, address, vehicleYear, vehicleMake, vehicleModel, vehicleTrim, vehicleMileage, zipCode },
  })
  return NextResponse.json(asset)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.manualAsset.deleteMany({ where: { id, userId } })
  return NextResponse.json({ success: true })
}

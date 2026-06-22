import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const assets = await db.manualAsset.findMany({ where: { userId }, orderBy: { category: 'asc' } })
  return NextResponse.json(assets)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, category, value, notes } = await req.json()
  const asset = await db.manualAsset.create({ data: { userId, name, category, value: parseFloat(value), notes } })
  return NextResponse.json(asset)
}

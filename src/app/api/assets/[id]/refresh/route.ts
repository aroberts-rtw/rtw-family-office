import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const asset = await db.manualAsset.findFirst({ where: { id, userId } })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let newValue: number | null = null
  let source = ''

  // ── Real Estate via Rentcast ────────────────────────────────────────────────
  if (asset.category === 'Real Estate' && asset.address) {
    const key = process.env.RENTCAST_API_KEY
    if (!key) return NextResponse.json({ error: 'RENTCAST_API_KEY not set' }, { status: 500 })

    const url = `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(asset.address)}`
    const res = await fetch(url, { headers: { 'X-Api-Key': key } })
    if (res.ok) {
      const data = await res.json()
      newValue = data.price ?? data.value ?? null
      source = 'Rentcast'
    } else {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err.message ?? 'Rentcast request failed' }, { status: 502 })
    }
  }

  // ── Vehicle via Edmunds ─────────────────────────────────────────────────────
  else if (asset.category === 'Vehicle' && asset.vehicleYear && asset.vehicleMake && asset.vehicleModel) {
    const key = process.env.EDMUNDS_API_KEY
    if (!key) return NextResponse.json({ error: 'EDMUNDS_API_KEY not configured yet' }, { status: 503 })

    const params = new URLSearchParams({
      api_key: key,
      fmt: 'json',
      ...(asset.vehicleMileage ? { mileage: String(asset.vehicleMileage) } : {}),
      ...(asset.zipCode ? { zip: asset.zipCode } : {}),
    })
    const url = `https://api.edmunds.com/v1/api/tmv/tmvservice/calculateusedtmv?${params}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      newValue = data.tmv?.totalWithOptions ?? data.tmv?.total ?? null
      source = 'Edmunds'
    } else {
      return NextResponse.json({ error: 'Edmunds request failed' }, { status: 502 })
    }
  }

  else {
    return NextResponse.json({ error: 'Asset missing required fields for refresh (address or vehicle details)' }, { status: 400 })
  }

  if (newValue === null) {
    return NextResponse.json({ error: 'Could not parse valuation from response' }, { status: 502 })
  }

  const updated = await db.manualAsset.update({
    where: { id },
    data: { value: newValue, lastRefreshed: new Date() },
  })

  return NextResponse.json({ value: newValue, source, asset: updated })
}

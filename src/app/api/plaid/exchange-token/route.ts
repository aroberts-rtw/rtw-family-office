import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { plaidClient } from '@/lib/plaid'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { public_token, institution_id, institution_name } = await req.json()

  const { data } = await plaidClient.itemPublicTokenExchange({ public_token })

  await db.plaidItem.create({
    data: {
      userId,
      accessToken: data.access_token,
      itemId: data.item_id,
      institutionId: institution_id ?? null,
      institutionName: institution_name ?? null,
    },
  })

  return NextResponse.json({ success: true })
}

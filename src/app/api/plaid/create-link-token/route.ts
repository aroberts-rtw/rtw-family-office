import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from '@/lib/plaid'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'RTW Family Office',
    products: PLAID_PRODUCTS,
    country_codes: PLAID_COUNTRY_CODES,
    language: 'en',
  })

  return NextResponse.json({ link_token: response.data.link_token })
}

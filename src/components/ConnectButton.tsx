'use client'

import { useCallback, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'

interface Props {
  label?: string
}

export default function ConnectButton({ label = 'Connect Account' }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchToken = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
    const data = await res.json()
    setLinkToken(data.link_token)
    setLoading(false)
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: async (public_token, metadata) => {
      await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token,
          institution_id: metadata.institution?.institution_id,
          institution_name: metadata.institution?.name,
        }),
      })
      await fetch('/api/plaid/sync', { method: 'POST' })
      window.location.reload()
    },
  })

  if (linkToken && ready) {
    return (
      <button
        onClick={() => open()}
        className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
      >
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={fetchToken}
      disabled={loading}
      className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
    >
      {loading ? 'Loading…' : label}
    </button>
  )
}

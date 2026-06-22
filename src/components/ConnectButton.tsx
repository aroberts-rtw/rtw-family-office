'use client'

import { useEffect, useRef, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'

interface Props {
  label?: string
}

export default function ConnectButton({ label = 'Connect Account' }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(false)
  const openOnReady = useRef(false)

  // Prefetch token on mount so first click is instant
  useEffect(() => {
    fetch('/api/plaid/create-link-token', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => { if (d.link_token) setLinkToken(d.link_token) })
      .catch(() => {})
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

  // Auto-open once ready if user already clicked
  useEffect(() => {
    if (ready && openOnReady.current) {
      openOnReady.current = false
      open()
    }
  }, [ready, open])

  const handleClick = async () => {
    if (ready) {
      open()
      return
    }
    // Token not ready yet — fetch it now and open once ready
    openOnReady.current = true
    if (!linkToken && !fetching) {
      setFetching(true)
      try {
        const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
        const data = await res.json()
        if (data.link_token) setLinkToken(data.link_token)
        else throw new Error()
      } catch {
        setError(true)
        openOnReady.current = false
        setTimeout(() => setError(false), 3000)
      } finally {
        setFetching(false)
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={fetching}
      className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
    >
      {error ? 'Error — retry' : fetching ? 'Loading…' : label}
    </button>
  )
}

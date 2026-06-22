'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncButton() {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const router = useRouter()

  const sync = async () => {
    setStatus('syncing')
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' })
      if (!res.ok) throw new Error()
      setStatus('done')
      router.refresh()
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const labels = {
    idle: 'Sync',
    syncing: 'Syncing…',
    done: 'Done',
    error: 'Failed',
  }

  const colors = {
    idle: 'bg-gray-800 hover:bg-gray-700 text-white',
    syncing: 'bg-gray-800 text-gray-400 cursor-not-allowed',
    done: 'bg-green-900 text-green-300',
    error: 'bg-red-900 text-red-300',
  }

  return (
    <button
      onClick={sync}
      disabled={status === 'syncing'}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${colors[status]}`}
    >
      {labels[status]}
    </button>
  )
}

'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

type Snapshot = { date: string; netWorth: number; assets: number; liabilities: number }

function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function fmtFull(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

export default function NetWorthChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 flex flex-col items-center justify-center h-48 text-center">
        <p className="text-gray-400 text-sm">Net worth chart will appear after your second sync</p>
        <p className="text-gray-600 text-xs mt-1">Hit Sync a few times over the coming days to start building history</p>
      </div>
    )
  }

  const first = snapshots[0].netWorth
  const last  = snapshots[snapshots.length - 1].netWorth
  const delta = last - first
  const pct   = first !== 0 ? ((delta / Math.abs(first)) * 100).toFixed(1) : '—'
  const up    = delta >= 0

  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Net Worth</p>
          <p className="text-3xl font-semibold mt-1">{fmtFull(last)}</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
            {up ? '+' : ''}{fmtFull(delta)}
          </p>
          <p className="text-xs text-gray-500">{up ? '▲' : '▼'} {pct}% all time</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={snapshots} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmt}
            width={56}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(v) => [fmtFull(Number(v)), '']}
            labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#nwGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
            name="Net Worth"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-gray-800 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500">Peak</p>
          <p className="text-sm font-medium mt-0.5">{fmtFull(Math.max(...snapshots.map((s) => s.netWorth)))}</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500">Snapshots</p>
          <p className="text-sm font-medium mt-0.5">{snapshots.length} syncs</p>
        </div>
      </div>
    </div>
  )
}

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

const nav = [
  { href: '/dashboard',              label: 'Overview' },
  { href: '/dashboard/accounts',     label: 'Accounts' },
  { href: '/dashboard/transactions', label: 'Transactions' },
  { href: '/dashboard/billing',      label: 'Billing' },
  { href: '/dashboard/goals',        label: 'Goals' },
  { href: '/dashboard/plan',         label: 'Plan' },
  { href: '/dashboard/investments',  label: 'Investments' },
  { href: '/dashboard/insurance',    label: 'Insurance' },
  { href: '/dashboard/tax',          label: 'Tax' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-semibold tracking-tight">RTW Family Office</span>
          <div className="flex gap-5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <UserButton afterSignOutUrl="/" />
      </nav>
      <main className="px-6 py-8 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}

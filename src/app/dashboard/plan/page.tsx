import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

const ROADMAP = [
  {
    horizon: '30 Days',
    color: 'border-blue-500',
    badge: 'bg-blue-900 text-blue-300',
    actions: [
      { title: 'Sync all accounts', detail: 'Make sure every bank, credit card, and investment account is connected and current.' },
      { title: 'Review subscription spend', detail: 'Check the Billing page — cancel anything unused. Average household saves $50–100/mo.' },
      { title: 'Zero out credit card balances', detail: 'Pay in full before next statement close. Kills interest immediately.' },
      { title: 'Verify emergency fund target', detail: 'Aim for 3 months of expenses in a HYSA. Below that, no new investments yet.' },
    ],
  },
  {
    horizon: '60 Days',
    color: 'border-green-500',
    badge: 'bg-green-900 text-green-300',
    actions: [
      { title: 'Open or fund HYSA', detail: 'Move idle cash earning < 2% APY to a high-yield account (5%+ APY). Takes 15 min online.' },
      { title: 'Max out HSA contributions', detail: '$8,300 family limit for 2025. Triple tax advantage — no account beats it.' },
      { title: 'Review auto and home insurance', detail: 'Get competing quotes. Rates have risen sharply; most people are overinsured or underinsured.' },
      { title: 'Set up auto-pay for all bills', detail: 'Eliminate late fees and protect credit score. Takes 30 min.' },
    ],
  },
  {
    horizon: '90 Days',
    color: 'border-yellow-500',
    badge: 'bg-yellow-900 text-yellow-300',
    actions: [
      { title: 'File Q2 estimated taxes', detail: 'If self-employed or S-corp, Q2 ES payment due June 15. Underpayment = penalty.' },
      { title: 'Review 401(k) / retirement allocation', detail: 'Rebalance if any asset class has drifted > 5% from target. Takes 20 min.' },
      { title: 'Audit recurring subscriptions again', detail: 'Do a second pass — trial periods often convert to paid quietly.' },
      { title: 'Start tax planning document', detail: 'List major income events, large deductions, and expected 1099s for year-end planning.' },
    ],
  },
  {
    horizon: '180 Days',
    color: 'border-orange-500',
    badge: 'bg-orange-900 text-orange-300',
    actions: [
      { title: 'Mid-year tax review', detail: 'Compare YTD income to prior year. Adjust W-4 or ES payments if tracking ahead or behind.' },
      { title: 'Assess vehicle equity', detail: 'Run a MarketCheck refresh on vehicles. If equity is negative (underwater), plan payoff strategy.' },
      { title: 'Check home equity position', detail: 'Update Rentcast value. With equity above 20%, consider a HELOC for emergency liquidity vs. selling.' },
      { title: 'Review life insurance coverage', detail: 'Coverage should be 10–12x income. Recalculate if income or dependents changed.' },
      { title: 'Roth conversion window review', detail: 'If income is lower than projected, consider converting traditional IRA funds to Roth before year-end.' },
    ],
  },
  {
    horizon: '360 Days',
    color: 'border-purple-500',
    badge: 'bg-purple-900 text-purple-300',
    actions: [
      { title: 'Max all tax-advantaged accounts', detail: '401(k) $23,500, IRA $7,000, HSA $8,300 (2025 limits). These compound tax-free for decades.' },
      { title: 'Year-end tax-loss harvesting', detail: 'Sell underperforming positions to offset gains before Dec 31. Re-buy after 30-day wash sale period.' },
      { title: 'File Q4 / annual estimated taxes', detail: 'Jan 15 deadline for Q4 ES payment. File by April 15 or extend.' },
      { title: 'Net worth snapshot', detail: 'Record exact balances Dec 31. Year-over-year growth is your single most important financial metric.' },
      { title: 'Estate plan review', detail: 'Review beneficiary designations on all accounts. Update will, POA, and HIPAA authorization if life changed.' },
      { title: 'Business entity review', detail: 'Verify S-corp election is still optimal vs. LLC or C-corp given current revenue and payroll levels.' },
    ],
  },
]

export default async function PlanPage() {
  const { userId } = await auth()

  const [accounts, manualAssets, goals] = await Promise.all([
    db.account.findMany({ where: { plaidItem: { userId: userId! } } }),
    db.manualAsset.findMany({ where: { userId: userId! } }),
    db.goal.findMany({ where: { userId: userId!, completed: false } }),
  ])

  const totalAssets = accounts
    .filter((a) => ['depository', 'investment', 'other'].includes(a.type))
    .reduce((s, a) => s + (a.currentBalance ?? 0), 0) + manualAssets.reduce((s, a) => s + a.value, 0)

  const totalLiabilities = accounts
    .filter((a) => ['credit', 'loan'].includes(a.type))
    .reduce((s, a) => s + Math.abs(a.currentBalance ?? 0), 0)

  const netWorth = totalAssets - totalLiabilities

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Financial Roadmap</h1>
        <p className="text-sm text-gray-400 mt-1">Action plan based on your current position — Net Worth {fmt(netWorth)}</p>
      </div>

      {goals.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Active Goals</p>
          {goals.map((g) => {
            const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100)
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{g.name}</span>
                  <span className="text-gray-400">{fmt(g.currentAmount)} / {fmt(g.targetAmount)}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="space-y-6">
        {ROADMAP.map((phase) => (
          <div key={phase.horizon} className={`border-l-2 ${phase.color} pl-5 space-y-3`}>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${phase.badge}`}>
                {phase.horizon}
              </span>
            </div>
            <div className="space-y-2">
              {phase.actions.map((action) => (
                <div key={action.title} className="bg-gray-900 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{action.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

// Due dates for each quarter
const QUARTER_DATES: Record<number, { month: number; day: number }> = {
  1: { month: 3,  day: 15 }, // Mar 15 (S-corp / partnership) or Apr 15 (individual)
  2: { month: 6,  day: 16 },
  3: { month: 9,  day: 15 },
  4: { month: 1,  day: 15 }, // Jan 15 of NEXT year
}

function quarterDueDate(year: number, quarter: number): Date {
  const { month, day } = QUARTER_DATES[quarter]
  const dueYear = quarter === 4 ? year + 1 : year
  return new Date(dueYear, month - 1, day)
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const year = parseInt(new URL(req.url).searchParams.get('year') ?? String(new Date().getFullYear()))
  const taxYear = await db.taxYear.findUnique({
    where: { userId_year: { userId, year } },
    include: { payments: { orderBy: { quarter: 'asc' } } },
  })
  return NextResponse.json(taxYear)
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { year, filingStatus, priorYearTax, estimatedIncome, estimatedDeductions, notes } = await req.json()

  // Safe harbor: 100% of prior year tax (110% if AGI > $150K MFJ)
  const safeHarbor = priorYearTax ? parseFloat(priorYearTax) * (parseFloat(estimatedIncome ?? '0') > 150000 ? 1.1 : 1.0) : null
  const quarterlyDue = safeHarbor ? safeHarbor / 4 : null

  const taxYear = await db.taxYear.upsert({
    where: { userId_year: { userId, year } },
    update: { filingStatus, priorYearTax: priorYearTax ? parseFloat(priorYearTax) : null, estimatedIncome: estimatedIncome ? parseFloat(estimatedIncome) : null, estimatedDeductions: estimatedDeductions ? parseFloat(estimatedDeductions) : null, notes },
    create: { userId, year, filingStatus, priorYearTax: priorYearTax ? parseFloat(priorYearTax) : null, estimatedIncome: estimatedIncome ? parseFloat(estimatedIncome) : null, estimatedDeductions: estimatedDeductions ? parseFloat(estimatedDeductions) : null, notes },
  })

  // Upsert all 4 quarters with due dates and default amounts
  for (const q of [1, 2, 3, 4]) {
    await db.taxPayment.upsert({
      where: { taxYearId_quarter: { taxYearId: taxYear.id, quarter: q } },
      update: { amountDue: quarterlyDue, dueDate: quarterDueDate(year, q) },
      create: { taxYearId: taxYear.id, quarter: q, dueDate: quarterDueDate(year, q), amountDue: quarterlyDue },
    })
  }

  const result = await db.taxYear.findUnique({ where: { id: taxYear.id }, include: { payments: { orderBy: { quarter: 'asc' } } } })
  return NextResponse.json(result)
}

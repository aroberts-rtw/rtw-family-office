import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page:       { padding: 48, fontFamily: 'Helvetica', backgroundColor: '#ffffff', color: '#111827' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  firm:       { fontSize: 10, color: '#6b7280', marginBottom: 2 },
  title:      { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#111827' },
  subtitle:   { fontSize: 10, color: '#6b7280', marginTop: 4 },
  date:       { fontSize: 10, color: '#6b7280', textAlign: 'right' },
  divider:    { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  section:    { marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel:   { fontSize: 10, color: '#374151' },
  rowSub:     { fontSize: 8, color: '#9ca3af', marginTop: 1 },
  rowValue:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },
  rowNeg:     { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#dc2626' },
  summaryBox: { backgroundColor: '#f9fafb', borderRadius: 4, padding: 16, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 11, color: '#374151' },
  summaryValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  netWorthVal: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  footer:     { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' },
  confidential: { fontSize: 8, color: '#d1d5db', textAlign: 'center' },
})

function fmtPdf(v: number, neg = false) {
  const s = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(v))
  return neg ? `(${s})` : s
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [accounts, manualAssets] = await Promise.all([
    db.account.findMany({
      where: { plaidItem: { userId } },
      include: { plaidItem: true },
      orderBy: { currentBalance: 'desc' },
    }),
    db.manualAsset.findMany({ where: { userId }, orderBy: { category: 'asc' } }),
  ])

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const assetAccts = accounts.filter((a) => ['depository', 'investment', 'other'].includes(a.type))
  const liabAccts  = accounts.filter((a) => ['credit', 'loan'].includes(a.type))

  const plaidAssets     = assetAccts.reduce((s, a) => s + (a.currentBalance ?? 0), 0)
  const manualTotal     = manualAssets.reduce((s, a) => s + a.value, 0)
  const totalAssets     = plaidAssets + manualTotal
  const totalLiabilities = liabAccts.reduce((s, a) => s + Math.abs(a.currentBalance ?? 0), 0)
  const netWorth        = totalAssets - totalLiabilities

  const pdf = await renderToBuffer(
    <Document title="Net Worth Statement" author="RTW Family Office">
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.firm}>RTW FAMILY OFFICE</Text>
            <Text style={styles.title}>Net Worth Statement</Text>
            <Text style={styles.subtitle}>Roberts Household — Confidential</Text>
          </View>
          <View>
            <Text style={styles.date}>As of {dateStr}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Assets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assets</Text>
          {assetAccts.map((a) => (
            <View key={a.id} style={styles.row}>
              <View>
                <Text style={styles.rowLabel}>{a.name}</Text>
                <Text style={styles.rowSub}>{a.plaidItem.institutionName} · {a.subtype ?? a.type}{a.mask ? ` ···${a.mask}` : ''}</Text>
              </View>
              <Text style={styles.rowValue}>{fmtPdf(a.currentBalance ?? 0)}</Text>
            </View>
          ))}
          {manualAssets.map((a) => (
            <View key={a.id} style={styles.row}>
              <View>
                <Text style={styles.rowLabel}>{a.name}</Text>
                <Text style={styles.rowSub}>{a.category}{a.address ? ` · ${a.address}` : ''}</Text>
              </View>
              <Text style={styles.rowValue}>{fmtPdf(a.value)}</Text>
            </View>
          ))}
        </View>

        {/* Liabilities */}
        {liabAccts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liabilities</Text>
            {liabAccts.map((a) => (
              <View key={a.id} style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>{a.name}</Text>
                  <Text style={styles.rowSub}>{a.plaidItem.institutionName} · {a.subtype ?? a.type}{a.mask ? ` ···${a.mask}` : ''}</Text>
                </View>
                <Text style={styles.rowNeg}>{fmtPdf(Math.abs(a.currentBalance ?? 0), true)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Assets</Text>
            <Text style={styles.summaryValue}>{fmtPdf(totalAssets)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Liabilities</Text>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{fmtPdf(totalLiabilities, true)}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#d1d5db', marginTop: 6, paddingTop: 8 }]}>
            <Text style={[styles.summaryLabel, { fontFamily: 'Helvetica-Bold', fontSize: 13 }]}>Net Worth</Text>
            <Text style={styles.netWorthVal}>{fmtPdf(netWorth)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>RTW Family Office · {dateStr}</Text>
          <Text style={styles.confidential}>CONFIDENTIAL — FOR INTERNAL USE ONLY</Text>
          <Text style={styles.footerText}>Page 1</Text>
        </View>
      </Page>
    </Document>
  )

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="net-worth-${now.toISOString().split('T')[0]}.pdf"`,
    },
  })
}

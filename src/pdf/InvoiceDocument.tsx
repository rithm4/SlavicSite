import { Document, Font, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { addDays } from 'date-fns'
import { deliveryRules } from '../config/catalog'
import { company, currency, invoiceValidityDays, vatRate } from '../config/company'
import { formatDateRo, fromIsoDate } from '../lib/dates'
import { amountInWords, formatMoney, formatPallets, formatQty } from '../lib/format'
import type { SavedOrder } from '../lib/types'

// Fontul implicit din PDF nu are diacritice (ș, ț, ă) — folosim Roboto.
Font.register({
  family: 'Roboto',
  fonts: [
    { src: `${import.meta.env.BASE_URL}fonts/Roboto-Regular.ttf` },
    { src: `${import.meta.env.BASE_URL}fonts/Roboto-Bold.ttf`, fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback((word) => [word])

const ACCENT = '#1f3a5f'
const MUTED = '#666'
const LINE = '#dde2e8'

const s = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 9, padding: 36, color: '#222', lineHeight: 1.35 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  brand: { fontSize: 16, lineHeight: 1.2, fontWeight: 'bold', color: ACCENT, marginBottom: 4 },
  muted: { color: MUTED },
  title: { fontSize: 14, lineHeight: 1.2, fontWeight: 'bold', textAlign: 'right', marginBottom: 4 },
  parties: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  party: { flex: 1, border: `1pt solid ${LINE}`, borderRadius: 3, padding: 8 },
  label: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', marginBottom: 3 },
  bold: { fontWeight: 'bold' },
  tableHead: { flexDirection: 'row', backgroundColor: ACCENT, color: '#fff', fontWeight: 'bold', paddingVertical: 4 },
  row: { flexDirection: 'row', borderBottom: `0.5pt solid ${LINE}`, paddingVertical: 4 },
  cNr: { width: 22, paddingHorizontal: 4 },
  cName: { flex: 1, paddingHorizontal: 4 },
  cUm: { width: 30, paddingHorizontal: 4, textAlign: 'center' },
  cQty: { width: 58, paddingHorizontal: 4, textAlign: 'right' },
  cPal: { width: 44, paddingHorizontal: 4, textAlign: 'right' },
  cPrice: { width: 58, paddingHorizontal: 4, textAlign: 'right' },
  cTotal: { width: 70, paddingHorizontal: 4, textAlign: 'right' },
  totals: { marginLeft: 'auto', width: 230, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 5, borderTop: `1pt solid ${ACCENT}`, fontSize: 11, fontWeight: 'bold' },
  words: { marginTop: 10 },
  payBox: { marginTop: 16, padding: 10, backgroundColor: '#f3f6fa', borderRadius: 3 },
  payRow: { flexDirection: 'row', marginBottom: 2 },
  payLabel: { width: 110, color: MUTED },
  footer: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between' },
  sign: { width: 200, borderTop: `0.5pt solid #999`, paddingTop: 3, color: MUTED, fontSize: 8 },
  note: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 7.5, color: MUTED, textAlign: 'center' },
})

const palletCount = new Intl.NumberFormat('ro-MD', { maximumFractionDigits: 1 })
const formatPalletCount = (n: number) => (n > 0 && n < 0.1 ? '<0,1' : palletCount.format(n))

function InvoiceDocument({ order }: { order: SavedOrder }) {
  const { draft, quote } = order
  const issued = new Date(order.issuedAt)
  const validUntil = addDays(issued, invoiceValidityDays)
  const client = draft.client
  const purpose = `Achitare conform cont de plată nr. ${order.number} din ${formatDateRo(issued)}`

  return (
    <Document title={`Cont de plată ${order.number}`} author={company.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{company.name}</Text>
            <Text style={s.muted}>{company.address}</Text>
            <Text style={s.muted}>
              {company.phone} · {company.email}
            </Text>
          </View>
          <View>
            <Text style={s.title}>CONT DE PLATĂ</Text>
            <Text style={{ textAlign: 'right' }}>nr. {order.number}</Text>
            <Text style={[s.muted, { textAlign: 'right' }]}>din {formatDateRo(issued)}</Text>
            <Text style={[s.muted, { textAlign: 'right' }]}>valabil până la {formatDateRo(validUntil)}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>Furnizor</Text>
            <Text style={s.bold}>{company.name}</Text>
            <Text>IDNO: {company.idno}</Text>
            <Text>Cod TVA: {company.vatCode}</Text>
            <Text>IBAN: {company.bank.iban}</Text>
            <Text>
              {company.bank.name}, cod {company.bank.code}
            </Text>
          </View>
          <View style={s.party}>
            <Text style={s.label}>Cumpărător</Text>
            <Text style={s.bold}>{client.name}</Text>
            {client.type === 'pj' && <Text>IDNO: {client.idno}</Text>}
            {client.contactPerson ? <Text>Persoană de contact: {client.contactPerson}</Text> : null}
            {client.address ? <Text>{client.address}</Text> : null}
            <Text>
              {client.phone} · {client.email}
            </Text>
          </View>
        </View>

        <Text style={[s.muted, { fontSize: 7.5, marginBottom: 3 }]}>
          Prețuri și sume fără TVA, în {currency}. Numărul de paleți este estimativ.
        </Text>
        <View style={s.tableHead} fixed>
          <Text style={s.cNr}>Nr.</Text>
          <Text style={s.cName}>Denumire</Text>
          <Text style={s.cUm}>U.M.</Text>
          <Text style={s.cQty}>Cant.</Text>
          <Text style={s.cPal}>Paleți</Text>
          <Text style={s.cPrice}>Preț</Text>
          <Text style={s.cTotal}>Suma</Text>
        </View>
        {quote.lines.map((line, i) => (
          <View style={s.row} key={i} wrap={false}>
            <Text style={s.cNr}>{i + 1}</Text>
            <View style={s.cName}>
              <Text>{line.description}</Text>
              <Text style={[s.muted, { fontSize: 8 }]}>{line.details}</Text>
            </View>
            <Text style={s.cUm}>{line.unit}</Text>
            <Text style={s.cQty}>{formatQty(line.qty)}</Text>
            <Text style={s.cPal}>{formatPalletCount(line.pallets)}</Text>
            <Text style={s.cPrice}>{formatMoney(line.unitPrice)}</Text>
            <Text style={s.cTotal}>{formatMoney(line.total)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>Volum estimat</Text>
            <Text>≈ {formatPallets(quote.totalPallets)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>Total produse</Text>
            <Text>{formatMoney(quote.productsSubtotal)}</Text>
          </View>
          {quote.discount > 0 && (
            <View style={s.totalRow}>
              <Text>Reducere volum ({Math.round(quote.discountPct * 100)}%)</Text>
              <Text>−{formatMoney(quote.discount)}</Text>
            </View>
          )}
          {quote.deliveryFee > 0 && (
            <View style={s.totalRow}>
              <Text>Livrare</Text>
              <Text>{formatMoney(quote.deliveryFee)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text>Total fără TVA</Text>
            <Text>{formatMoney(quote.netTotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>TVA {Math.round(vatRate * 100)}%</Text>
            <Text>{formatMoney(quote.vat)}</Text>
          </View>
          <View style={s.grand}>
            <Text>Total de plată</Text>
            <Text>
              {formatMoney(quote.total)} {currency}
            </Text>
          </View>
        </View>

        <Text style={s.words}>
          Suma în litere: <Text style={s.bold}>{amountInWords(quote.total)}</Text>
        </Text>

        <View style={s.payBox} wrap={false}>
          <Text style={[s.label, { marginBottom: 5 }]}>Date pentru achitare</Text>
          {[
            ['Beneficiar', company.name],
            ['IDNO', company.idno],
            ['IBAN', company.bank.iban],
            ['Banca', `${company.bank.name}, cod ${company.bank.code}`],
            ['Suma', `${formatMoney(quote.total)} ${currency}`],
            ['Destinația plății', purpose],
          ].map(([label, value]) => (
            <View style={s.payRow} key={label}>
              <Text style={s.payLabel}>{label}</Text>
              <Text style={[s.bold, { flex: 1 }]}>{value}</Text>
            </View>
          ))}
          <View style={[s.payRow, { marginTop: 6 }]}>
            <Text style={s.payLabel}>{draft.deliveryMethod === 'delivery' ? 'Livrare' : 'Ridicare'}</Text>
            <Text style={{ flex: 1 }}>
              {draft.date ? formatDateRo(fromIsoDate(draft.date)) : '—'}
              {draft.deliveryMethod === 'delivery'
                ? `, ${draft.deliveryAddress}${deliveryRules.fee === null ? ' (costul livrării se stabilește separat)' : ''}`
                : ', de la sediul firmei'}
            </Text>
          </View>
        </View>

        {client.notes ? (
          <Text style={{ marginTop: 10 }}>
            <Text style={s.muted}>Mențiuni client: </Text>
            {client.notes}
          </Text>
        ) : null}

        <View style={s.footer} wrap={false}>
          <Text style={s.sign}>Director: {company.director}</Text>
          <Text style={s.sign}>Semnătura / ștampila</Text>
        </View>

        <Text style={s.note} fixed>
          Document generat electronic. Producția începe după confirmarea plății. Contul de plată nu este factură fiscală.
        </Text>
      </Page>
    </Document>
  )
}

export function renderInvoicePdf(order: SavedOrder): Promise<Blob> {
  return pdf(<InvoiceDocument order={order} />).toBlob()
}

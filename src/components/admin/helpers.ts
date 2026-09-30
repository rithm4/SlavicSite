import { addDays, format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { calendarRules, holidays } from '../../config/calendar'
import { invoiceValidityDays } from '../../config/company'
import { statusLabel } from '../../lib/backend/types'
import type { ClosedDay, OrderRecord } from '../../lib/backend/types'
import { formatDateRo, fromIsoDate, toIsoDate } from '../../lib/dates'
import { downloadBlob } from '../../lib/download'

export const todayIso = () => toIsoDate(new Date())
export const inDaysIso = (n: number) => toIsoDate(addDays(new Date(), n))

/** „Joi, 8 octombrie” */
export function dayLabel(iso: string, withYear = false) {
  const text = format(fromIsoDate(iso), withYear ? 'EEEE, d MMMM yyyy' : 'EEEE, d MMMM', { locale: ro })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const shortDate = (iso: string) => formatDateRo(fromIsoDate(iso))

export const isActive = (o: OrderRecord) => o.status !== 'anulata'

/** Comenzile programate într-o zi: întâi cele active, la urmă cele anulate. */
export function ordersOn(orders: OrderRecord[], day: string) {
  return orders
    .filter((o) => o.draft.date === day)
    .sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || a.number.localeCompare(b.number))
}

export type DayKind = 'work' | 'weekend' | 'holiday' | 'closed'

export function dayKind(iso: string, closed: ClosedDay[]): DayKind {
  if (closed.some((c) => c.day === iso)) return 'closed'
  const d = fromIsoDate(iso).getDay()
  if (d === 0 || d === 6) return 'weekend'
  if (holidays.includes(iso)) return 'holiday'
  return 'work'
}

export const capacity = calendarRules.maxOrdersPerDay

/** Termenul de plată al contului (valabil câteva zile de la emitere). */
export const paymentDue = (o: OrderRecord) => addDays(new Date(o.issuedAt), invoiceValidityDays)

export interface Alert {
  order: OrderRecord
  kind: 'overdue' | 'unpaid-soon' | 'past-date'
  text: string
}

/** Ce trebuie rezolvat: plăți întârziate, comenzi apropiate neachitate, date trecute nemarcate ca livrate. */
export function alertsFor(orders: OrderRecord[]): Alert[] {
  const today = todayIso()
  const soon = inDaysIso(2)
  const now = new Date()
  const alerts: Alert[] = []
  for (const order of orders) {
    const day = order.draft.date
    if (order.status === 'noua' && paymentDue(order) < now) {
      alerts.push({
        order,
        kind: 'overdue',
        text: `Proforma a expirat pe ${formatDateRo(paymentDue(order))} și nu e achitată.`,
      })
    } else if (order.status === 'noua' && day && day <= soon) {
      alerts.push({ order, kind: 'unpaid-soon', text: `Programată pe ${shortDate(day)}, dar încă neachitată.` })
    }
    if (day && day < today && ['achitata', 'productie', 'gata'].includes(order.status)) {
      alerts.push({
        order,
        kind: 'past-date',
        text: `Data de ${shortDate(day)} a trecut, iar comanda e „${statusLabel(order.status)}”: marcați livrarea sau mutați data.`,
      })
    }
  }
  const rank = { overdue: 0, 'past-date': 1, 'unpaid-soon': 2 }
  return alerts.sort((a, b) => rank[a.kind] - rank[b.kind])
}

/** Comenzile, pentru Excel (separator „;”, zecimale cu virgulă, diacritice păstrate). */
export function exportCsv(orders: OrderRecord[]) {
  const header = [
    'Număr',
    'Emis',
    'Firma',
    'CUI',
    'Telefon',
    'E-mail',
    'Primire',
    'Data',
    'Adresa',
    'Paleți',
    'Total cu TVA',
    'Status',
  ]
  const cell = (v: string | number) => {
    const s = String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = orders.map((o) => [
    o.number,
    formatDateRo(new Date(o.issuedAt)),
    o.draft.client.name,
    o.draft.client.cui,
    o.draft.client.phone,
    o.draft.client.email,
    o.draft.deliveryMethod === 'delivery' ? 'Livrare' : 'Ridicare',
    o.draft.date ? shortDate(o.draft.date) : '',
    o.draft.deliveryMethod === 'delivery' ? o.draft.deliveryAddress : '',
    o.quote.totalPallets,
    o.quote.total.toFixed(2).replace('.', ','),
    statusLabel(o.status),
  ])
  const csv = [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `comenzi-${todayIso()}.csv`)
}

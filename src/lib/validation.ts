import { standardProducts } from '../config/catalog'
import { fromIsoDate, isFullyBooked, isWorkingDay } from './dates'
import { validateCustomItem } from './pricing'
import type { ClientInfo, OrderDraft, Quote } from './types'

export function clientErrors(c: ClientInfo): Partial<Record<keyof ClientInfo, string>> {
  const errors: Partial<Record<keyof ClientInfo, string>> = {}
  if (!c.name.trim()) errors.name = c.type === 'pj' ? 'Introduceți denumirea firmei.' : 'Introduceți numele.'
  if (c.type === 'pj' && !/^\d{13}$/.test(c.idno.trim())) errors.idno = 'IDNO trebuie să aibă 13 cifre.'
  if (!/^\+?[\d\s()-]{8,}$/.test(c.phone.trim())) errors.phone = 'Introduceți un număr de telefon valid.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) errors.email = 'Introduceți un email valid.'
  return errors
}

export interface ScheduleContext {
  earliest: Date
  latest: Date
  booked: Record<string, number>
}

/** Erorile care blochează trecerea de la pasul `step` la următorul. */
export function stepErrors(step: number, draft: OrderDraft, quote: Quote, schedule: ScheduleContext): string[] {
  const errors: string[] = []
  switch (step) {
    case 0:
      for (const p of standardProducts) {
        const qty = draft.standard[p.id] ?? 0
        if (qty > 0 && qty < p.minQty) errors.push(`${p.name} ${p.size}: minim ${p.minQty} ${p.unit}.`)
      }
      draft.custom.forEach((item, i) => {
        const err = validateCustomItem(item)
        if (err) errors.push(`Element ${i + 1}: ${err}`)
      })
      if (errors.length === 0 && quote.lines.length === 0) {
        errors.push('Adăugați cel puțin un element standard sau personalizat.')
      }
      break
    case 1: {
      if (draft.deliveryMethod === 'delivery' && !draft.deliveryAddress.trim()) {
        errors.push('Introduceți adresa de livrare.')
      }
      if (!draft.date) {
        errors.push('Alegeți o dată din calendar.')
      } else {
        const d = fromIsoDate(draft.date)
        // Data poate deveni invalidă dacă între timp s-a schimbat comanda (ex. s-au adăugat elemente personalizate).
        if (d < schedule.earliest || d > schedule.latest || !isWorkingDay(d) || isFullyBooked(d, schedule.booked)) {
          errors.push('Data aleasă nu mai este disponibilă pentru această comandă. Alegeți altă dată.')
        }
      }
      break
    }
    case 2:
      errors.push(...Object.values(clientErrors(draft.client)))
      break
  }
  return errors
}

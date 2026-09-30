import { standardProducts } from '../config/catalog'
import { fromIsoDate, isFullyBooked, isWorkingDay } from './dates'
import { validateCustomItem } from './pricing'
import type { CompanyProfile } from './backend/types'
import type { ClientInfo, OrderDraft, Quote } from './types'

/**
 * CUI (codul fiscal al firmei): 2–10 cifre, cu „RO” în față la plătitorii de TVA.
 * Ultima cifră e cifra de control, calculată cu cheia 753217532.
 */
export function isValidCui(value: string): boolean {
  const digits = value.trim().toUpperCase().replace(/^RO/, '').replace(/\s/g, '')
  if (!/^\d{2,10}$/.test(digits)) return false
  const body = digits.slice(0, -1).padStart(9, '0')
  const key = [7, 5, 3, 2, 1, 7, 5, 3, 2]
  const sum = [...body].reduce((acc, d, i) => acc + Number(d) * key[i], 0)
  return ((sum * 10) % 11) % 10 === Number(digits.at(-1))
}

export function clientErrors(c: ClientInfo): Partial<Record<keyof ClientInfo, string>> {
  const errors: Partial<Record<keyof ClientInfo, string>> = {}
  if (!c.name.trim()) errors.name = c.type === 'pj' ? 'Introduceți denumirea firmei.' : 'Introduceți numele.'
  if (c.type === 'pj' && !isValidCui(c.cui)) errors.cui = 'Verificați CUI-ul: 2–10 cifre, cu sau fără „RO” în față.'
  if (!/^\+?[\d\s()-]{8,}$/.test(c.phone.trim())) errors.phone = 'Introduceți un număr de telefon valid.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) errors.email = 'Introduceți un email valid.'
  return errors
}

/** Datele firmei din cont: aceleași reguli ca în formularul de comandă. */
export function profileErrors(p: CompanyProfile): Partial<Record<keyof CompanyProfile, string>> {
  const { name, cui, phone, email } = clientErrors({ ...p, type: 'pj', notes: '' })
  return Object.fromEntries(Object.entries({ name, cui, phone, email }).filter(([, v]) => v))
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

import type { OrderDraft } from './types'

/** Ciorna comenzii se păstrează în browser între vizite. */
export const DRAFT_KEY = 'slavic.draft'

/** Pune produsele și livrarea unei comenzi vechi în formular, fără dată, și deschide formularul. */
export function repeatOrder(draft: OrderDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, date: null }))
  } catch {
    // fără stocare, formularul pornește gol
  }
  window.location.hash = '#/comanda'
}

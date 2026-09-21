import { invoicePrefix } from '../config/company'
import type { OrderDraft, Quote, SavedOrder } from './types'

/**
 * Stocarea comenzilor. Acum e în localStorage (doar în browserul curent).
 * Pentru Supabase se scrie o altă implementare a aceleiași interfețe,
 * iar numărul contului de plată se generează atunci pe server.
 */
export interface OrderStore {
  /** Numărul de comenzi deja programate pe fiecare zi (YYYY-MM-DD). */
  getBookedCounts(): Promise<Record<string, number>>
  /** Salvează comanda și îi atribuie numărul contului de plată. */
  createOrder(draft: OrderDraft, quote: Quote): Promise<SavedOrder>
}

const ORDERS_KEY = 'slavic.orders'
const COUNTER_KEY = 'slavic.invoiceCounter'

function readOrders(): SavedOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '[]') as SavedOrder[]
  } catch {
    return []
  }
}

export const localOrderStore: OrderStore = {
  async getBookedCounts() {
    const counts: Record<string, number> = {}
    for (const order of readOrders()) {
      if (order.draft.date) counts[order.draft.date] = (counts[order.draft.date] ?? 0) + 1
    }
    return counts
  },

  async createOrder(draft, quote) {
    const year = new Date().getFullYear()
    const counter = Number(localStorage.getItem(COUNTER_KEY) ?? '0') + 1
    localStorage.setItem(COUNTER_KEY, String(counter))
    const order: SavedOrder = {
      number: `${invoicePrefix}-${year}-${String(counter).padStart(4, '0')}`,
      issuedAt: new Date().toISOString(),
      draft,
      quote,
    }
    localStorage.setItem(ORDERS_KEY, JSON.stringify([...readOrders(), order]))
    return order
  },
}

export const orderStore: OrderStore = localOrderStore

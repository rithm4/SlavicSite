import type { OrderDraft, Quote } from '../lib/types'

export interface StepProps {
  draft: OrderDraft
  update: (patch: Partial<OrderDraft>) => void
  quote: Quote
  /** true după ce vizitatorul a încercat să treacă mai departe — afișăm erorile. */
  showErrors: boolean
}

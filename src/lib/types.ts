export interface CustomItem {
  id: string
  name: string
  woodId: string
  lengthMm: number
  widthMm: number
  thicknessMm: number
  qty: number
  finishIds: string[]
}

export type ClientType = 'pf' | 'pj'
export type DeliveryMethod = 'pickup' | 'delivery'

export interface ClientInfo {
  type: ClientType
  name: string
  /** IDNO — obligatoriu doar pentru persoane juridice. */
  idno: string
  contactPerson: string
  phone: string
  email: string
  address: string
  notes: string
}

export interface OrderDraft {
  /** productId -> cantitate */
  standard: Record<string, number>
  custom: CustomItem[]
  deliveryMethod: DeliveryMethod
  deliveryAddress: string
  /** Data aleasă, YYYY-MM-DD. */
  date: string | null
  client: ClientInfo
}

export interface QuoteLine {
  description: string
  details: string
  unit: string
  qty: number
  unitPrice: number
  total: number
}

export interface Quote {
  lines: QuoteLine[]
  productsSubtotal: number
  discountPct: number
  discount: number
  deliveryFee: number
  netTotal: number
  vat: number
  total: number
  totalPieces: number
}

export interface SavedOrder {
  number: string
  issuedAt: string
  draft: OrderDraft
  quote: Quote
}

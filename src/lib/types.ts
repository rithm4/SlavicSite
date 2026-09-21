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
/** În ce unitate introduce clientul cantitățile. Intern, cantitatea e mereu în bucăți. */
export type QtyUnit = 'pallet' | 'piece'

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
  qtyUnit: QtyUnit
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
  /** Paleți ocupați (poate fi fracționar). */
  pallets: number
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
  /** Paleți necesari la transport (rotunjit în sus). */
  totalPallets: number
}

export interface SavedOrder {
  number: string
  issuedAt: string
  draft: OrderDraft
  quote: Quote
}

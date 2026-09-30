import type { OrderDraft, Quote, SavedOrder } from '../types'

export type OrderStatus = 'noua' | 'achitata' | 'productie' | 'gata' | 'livrata' | 'anulata'

/** Statusurile comenzii, în ordinea prin care trece. */
export const orderStatuses: { id: OrderStatus; label: string; hint: string }[] = [
  { id: 'noua', label: 'Așteaptă plata', hint: 'Factura proformă a fost emisă.' },
  { id: 'achitata', label: 'Achitată', hint: 'Plata a fost primită.' },
  { id: 'productie', label: 'În producție', hint: 'Elementele se debitează.' },
  { id: 'gata', label: 'Gata', hint: 'Comanda e pregătită de ridicare sau livrare.' },
  { id: 'livrata', label: 'Livrată', hint: 'Comanda a fost predată.' },
  { id: 'anulata', label: 'Anulată', hint: 'Comanda nu mai e valabilă.' },
]

export const statusLabel = (status: OrderStatus) => orderStatuses.find((s) => s.id === status)?.label ?? status

export interface CompanyProfile {
  name: string
  /** CUI (cod fiscal) */
  cui: string
  /** Nr. Reg. Com. */
  regCom: string
  contactPerson: string
  phone: string
  email: string
  address: string
}

export const emptyProfile = (): CompanyProfile => ({
  name: '',
  cui: '',
  regCom: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
})

export interface DeliveryAddress {
  id: string
  label: string
  address: string
  isDefault: boolean
}

export interface OrderEvent {
  status: OrderStatus
  note: string
  at: string
}

export interface OrderRecord extends SavedOrder {
  id: string
  userId: string | null
  status: OrderStatus
  /** Istoricul statusurilor, cel mai vechi primul. */
  events: OrderEvent[]
}

export type DocumentKind = 'factura' | 'certificat' | 'alt'

export const documentKinds: { id: DocumentKind; label: string }[] = [
  { id: 'factura', label: 'Factură' },
  { id: 'certificat', label: 'Certificat ISPM 15' },
  { id: 'alt', label: 'Alt document' },
]

export interface DocumentRecord {
  id: string
  userId: string
  orderNumber: string | null
  kind: DocumentKind
  title: string
  fileName: string
  /** Unde e păstrat fișierul (calea din spațiul de stocare sau, în modul demonstrativ, conținutul). */
  filePath: string
  createdAt: string
}

export interface AccountUser {
  id: string
  email: string
  /** doar în sesiunea panoului admin: contul are drepturi de administrator */
  isAdmin: boolean
}

/** Un client, văzut din panoul de administrare. */
export interface ClientRecord {
  userId: string
  profile: CompanyProfile
  createdAt: string
}

/** Zi în care nu se primesc comenzi noi (o închide adminul din calendar). */
export interface ClosedDay {
  /** YYYY-MM-DD */
  day: string
  reason: string
}

/** Un mesaj trimis din pagina de contacte. */
export interface ContactMessage {
  id: string
  name: string
  company: string
  /** telefon sau e-mail, cum a fost scris */
  contact: string
  text: string
  createdAt: string
  /** adminul l-a rezolvat (a răspuns, a sunat) */
  handled: boolean
}

export type ContactMessageInput = Pick<ContactMessage, 'name' | 'company' | 'contact' | 'text'>

export type AuthEvent = 'signed-in' | 'signed-out' | 'recovery'

/** Cui îi aparține sesiunea: contului de client sau panoului admin (sesiuni separate). */
export type BackendScope = 'client' | 'admin'

/**
 * Tot ce are nevoie site-ul de la server. Implementări: Supabase (conturi reale) și
 * modul demonstrativ (totul în browser), folosit cât timp Supabase nu e configurat.
 */
export interface Backend {
  mode: 'supabase' | 'demo'

  currentUser(): Promise<AccountUser | null>
  onAuthChange(callback: (user: AccountUser | null, event: AuthEvent) => void): () => void
  /** Creează contul; întoarce true dacă trebuie confirmată adresa de e-mail. */
  signUp(email: string, password: string, profile: CompanyProfile): Promise<{ needsConfirmation: boolean }>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>

  getProfile(): Promise<CompanyProfile | null>
  saveProfile(profile: CompanyProfile): Promise<void>
  listAddresses(): Promise<DeliveryAddress[]>
  saveAddress(address: Omit<DeliveryAddress, 'id'> & { id?: string }): Promise<void>
  deleteAddress(id: string): Promise<void>

  /** Câte comenzi sunt programate pe fiecare zi (YYYY-MM-DD). */
  bookedCounts(): Promise<Record<string, number>>
  /** Zilele închise de admin, de acum încolo; în formularul de comandă nu se pot alege. */
  closedDays(): Promise<ClosedDay[]>
  /** Salvează comanda (legată de cont, dacă e cineva autentificat) și îi dă numărul facturii proforme. */
  createOrder(draft: OrderDraft, quote: Quote): Promise<SavedOrder>
  listMyOrders(): Promise<OrderRecord[]>
  listMyDocuments(): Promise<DocumentRecord[]>
  /** Adresă temporară de descărcare pentru un document. */
  documentUrl(document: DocumentRecord): Promise<string>
  /** Mesaj din pagina de contacte; merge și fără cont. */
  sendMessage(message: ContactMessageInput): Promise<void>

  admin: {
    listOrders(): Promise<OrderRecord[]>
    setOrderStatus(orderId: string, status: OrderStatus, note: string): Promise<void>
    /** Mută data livrării sau a ridicării; clientul vede mutarea în istoric. */
    rescheduleOrder(orderId: string, day: string, note: string): Promise<void>
    /** Închide sau redeschide o zi pentru comenzi noi. */
    setDayClosed(day: string, closed: boolean, reason: string): Promise<void>
    /** Notele interne ale echipei, pe comenzi (clientul nu le vede). */
    listNotes(): Promise<Record<string, string>>
    saveNote(orderId: string, note: string): Promise<void>
    listClients(): Promise<ClientRecord[]>
    listDocuments(): Promise<DocumentRecord[]>
    uploadDocument(input: {
      userId: string
      orderNumber: string | null
      kind: DocumentKind
      title: string
      file: File
    }): Promise<void>
    deleteDocument(document: DocumentRecord): Promise<void>
    /** Mesajele din pagina de contacte, cele mai noi primele. */
    listMessages(): Promise<ContactMessage[]>
    setMessageHandled(id: string, handled: boolean): Promise<void>
  }
}

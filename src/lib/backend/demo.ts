// Modul demonstrativ: conturile, comenzile și documentele se păstrează doar în acest browser (localStorage).
// Se folosește cât timp Supabase nu e configurat, ca cabinetul să poată fi încercat:
//  - se intră cu ORICE e-mail și ORICE parolă; contul de client se creează singur, cu câteva date de probă;
//  - intrarea din pagina panoului admin deschide un cont de administrator; panoul și contul de client
//    au sesiuni separate, deci se poate fi intrat în amândouă deodată.
// Cu Supabase conectat (supabase.ts) parola se verifică pe server, iar panoul admin e doar pentru tabelul admins.
import { invoicePrefix } from '../../config/company'
import { isWorkingDay, toIsoDate } from '../dates'
import { computeQuote } from '../pricing'
import type { OrderDraft, SavedOrder } from '../types'
import type {
  AccountUser,
  AuthEvent,
  Backend,
  BackendScope,
  ClosedDay,
  CompanyProfile,
  ContactMessage,
  DeliveryAddress,
  DocumentRecord,
  OrderRecord,
  OrderStatus,
} from './types'
import { orderStatuses } from './types'

const KEY = 'slavic.demo'
const MAX_FILE = 3 * 1024 * 1024
const DAY = 86_400_000
const DEMO_EMAIL = 'demo@exemplu.ro'
const DEMO_ADMIN_EMAIL = 'admin@exemplu.ro'

const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString()
const demoFile = (text: string) => `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`

/** Două mesaje din pagina de contacte, pentru panoul admin de probă. */
function sampleMessages(): ContactMessage[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Elena Ciobanu',
      company: 'Livada Nord S.R.L.',
      contact: '+40 745 456 789',
      text: 'Bună ziua! Avem nevoie de lădițe pentru cireșe, cu pereți mai joși (40 mm). Puteți produce și ce termen ar fi pentru 5.000 de seturi?',
      createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
      handled: false,
    },
    {
      id: crypto.randomUUID(),
      name: 'Andrei Popa',
      company: '',
      contact: 'andrei.popa@exemplu.ro',
      text: 'Livrați și în județul Constanța? Care e costul transportului pentru 4 paleți?',
      createdAt: daysAgo(2),
      handled: true,
    },
  ]
}

/** Prima zi lucrătoare începând de la azi + `offset` zile (înapoi, pentru datele din trecut). */
function workday(offset: number) {
  const d = new Date(Date.now() + offset * DAY)
  const step = offset < 0 ? -1 : 1
  while (!isWorkingDay(d)) d.setDate(d.getDate() + step)
  return toIsoDate(d)
}

interface SampleOrder {
  /** acum câte zile a fost emisă factura proformă */
  ago: number
  status: OrderStatus
  standard: Record<string, number>
  /** adresa de livrare; fără ea, ridicare de la sediu */
  delivery?: string
  /** peste câte zile e livrarea sau ridicarea */
  inDays: number
}

function sampleOrder(userId: string, profile: CompanyProfile, nextNumber: () => string, spec: SampleOrder): OrderRecord {
  const draft: OrderDraft = {
    standard: spec.standard,
    custom: [],
    qtyUnit: 'piece',
    deliveryMethod: spec.delivery ? 'delivery' : 'pickup',
    deliveryAddress: spec.delivery ?? '',
    date: workday(spec.inDays),
    client: { type: 'pj', ...profile, notes: '' },
  }
  const reached =
    spec.status === 'anulata'
      ? [orderStatuses[0], orderStatuses[orderStatuses.length - 1]]
      : orderStatuses.slice(0, orderStatuses.findIndex((s) => s.id === spec.status) + 1)
  return {
    id: crypto.randomUUID(),
    number: nextNumber(),
    issuedAt: daysAgo(spec.ago),
    draft,
    quote: computeQuote(draft),
    userId,
    status: spec.status,
    events: reached.map((s, i) => ({
      status: s.id,
      note: s.id === 'achitata' ? 'Plata primită prin transfer bancar' : s.id === 'anulata' ? 'Anulată la cererea clientului' : '',
      at: daysAgo(Math.max(0, spec.ago - i * 1.5)),
    })),
  }
}

/** Firmele-client de probă pe care le vede primul administrator din modul demonstrativ. */
function sampleClients(nextNumber: () => string) {
  const clients: { email: string; profile: CompanyProfile; orders: SampleOrder[] }[] = [
    {
      email: 'comenzi@agrofruct.ro',
      profile: {
        name: 'Agrofruct Export S.R.L.',
        cui: 'RO18456728',
        regCom: 'J39/412/2006',
        contactPerson: 'Ion Rusu',
        phone: '+40 723 123 456',
        email: 'comenzi@agrofruct.ro',
        address: 'Str. Industriei nr. 4, Focșani, jud. Vrancea',
      },
      orders: [
        { ago: 3, status: 'productie', standard: { 'set-lada': 2400 }, delivery: 'Str. Industriei nr. 4, Focșani, jud. Vrancea', inDays: 1 },
        { ago: 2, status: 'achitata', standard: { laterala: 6000, capat: 6000 }, delivery: 'Str. Industriei nr. 4, Focșani, jud. Vrancea', inDays: 6 },
        { ago: 8, status: 'noua', standard: { fund: 5000 }, inDays: 3 },
      ],
    },
    {
      email: 'aprovizionare@vinnord.ro',
      profile: {
        name: 'Vin Nord S.A.',
        cui: 'RO24680133',
        regCom: 'J22/1530/2008',
        contactPerson: 'Maria Constantin',
        phone: '+40 232 456 789',
        email: 'aprovizionare@vinnord.ro',
        address: 'Bd. Ștefan cel Mare nr. 90, Iași, jud. Iași',
      },
      orders: [
        { ago: 5, status: 'gata', standard: { 'set-lada': 800 }, inDays: 0 },
        { ago: 4, status: 'gata', standard: { traversa: 4000, montant: 8000 }, delivery: 'Str. Industrială nr. 22, Iași, jud. Iași', inDays: -1 },
        { ago: 1, status: 'noua', standard: { 'set-lada': 1200 }, delivery: 'Str. Industrială nr. 22, Iași, jud. Iași', inDays: 8 },
      ],
    },
    {
      email: 'office@fructesud.ro',
      profile: {
        name: 'Fructe Sud S.R.L.',
        cui: '35791340',
        regCom: '',
        contactPerson: 'Andrei Munteanu',
        phone: '+40 745 555 111',
        email: 'office@fructesud.ro',
        address: 'Str. Portului nr. 3, Constanța, jud. Constanța',
      },
      orders: [
        { ago: 1, status: 'noua', standard: { 'set-lada': 600 }, delivery: 'Str. Portului nr. 3, Constanța, jud. Constanța', inDays: 1 },
        { ago: 6, status: 'achitata', standard: { 'set-lada': 1600 }, inDays: 6 },
        { ago: 9, status: 'anulata', standard: { fund: 3000 }, inDays: 4 },
        { ago: 40, status: 'livrata', standard: { 'set-lada': 3000 }, delivery: 'Str. Portului nr. 3, Constanța, jud. Constanța', inDays: -28 },
      ],
    },
  ]
  return clients.map((c) => {
    const id = crypto.randomUUID()
    return {
      user: { id, email: c.email, password: '', createdAt: daysAgo(45), admin: false } as DemoUser,
      profile: c.profile,
      orders: c.orders.map((spec) => sampleOrder(id, c.profile, nextNumber, spec)),
    }
  })
}

/** Firma, adresele, comenzile și documentele de probă ale unui cont demonstrativ nou. */
function sampleAccount(userId: string, email: string, nextNumber: () => string) {
  const profile: CompanyProfile = {
    name: 'Firma Demonstrativă S.R.L.',
    cui: 'RO11235819',
    regCom: 'J40/1234/2015',
    contactPerson: 'Ion Popescu',
    phone: '+40 721 000 000',
    email,
    address: 'Str. Exemplu nr. 10, București, sector 3',
  }
  const addresses: DeliveryAddress[] = [
    { id: crypto.randomUUID(), label: 'Depozit Focșani', address: 'Str. Industriei nr. 4, Focșani, jud. Vrancea', isDefault: true },
    { id: crypto.randomUUID(), label: 'Depozit frigorific Panciu', address: 'Str. Podgoriei nr. 8, Panciu, jud. Vrancea', isDefault: false },
  ]
  const order = (spec: SampleOrder) => sampleOrder(userId, profile, nextNumber, spec)
  const delivered = order({ ago: 34, status: 'livrata', standard: { 'set-lada': 2000 }, delivery: addresses[0].address, inDays: -24 })
  const orders = [
    delivered,
    order({ ago: 9, status: 'productie', standard: { laterala: 6000, capat: 6000, fund: 9000 }, delivery: addresses[1].address, inDays: 5 }),
    order({ ago: 1, status: 'noua', standard: { 'set-lada': 800 }, inDays: 8 }),
  ]
  const note = 'Document demonstrativ. Cu Supabase conectat, aici se descarcă fișierul încărcat de EUROVYPCUC.'
  const documents: DocumentRecord[] = [
    {
      id: crypto.randomUUID(),
      userId,
      orderNumber: delivered.number,
      kind: 'factura',
      title: `Factura fiscală pentru comanda ${delivered.number}`,
      fileName: 'factura-demonstrativa.txt',
      filePath: demoFile(note),
      createdAt: daysAgo(24),
    },
    {
      id: crypto.randomUUID(),
      userId,
      orderNumber: delivered.number,
      kind: 'certificat',
      title: `Certificat ISPM 15, lotul ${delivered.number}`,
      fileName: 'certificat-demonstrativ.txt',
      filePath: demoFile(note),
      createdAt: daysAgo(24),
    },
  ]
  return { profile, addresses, orders, documents }
}

interface DemoUser {
  id: string
  email: string
  password: string
  createdAt: string
  /** cont deschis din panoul admin */
  admin?: boolean
}

interface DemoState {
  users: DemoUser[]
  /** sesiunea contului de client */
  session: string | null
  /** sesiunea panoului admin, separată */
  adminSession: string | null
  profiles: Record<string, CompanyProfile>
  addresses: Record<string, DeliveryAddress[]>
  orders: OrderRecord[]
  counter: number
  documents: DocumentRecord[]
  closedDays: ClosedDay[]
  notes: Record<string, string>
  messages: ContactMessage[]
}

const emptyState = (): DemoState => ({
  users: [],
  session: null,
  adminSession: null,
  profiles: {},
  addresses: {},
  orders: [],
  counter: 0,
  documents: [],
  closedDays: [],
  notes: {},
  messages: [],
})

type LegacyFirm = { cui?: string; regCom?: string; idno?: string; vatCode?: string }

/** Firmele salvate înainte de trecerea la CUI / Reg. Com. primesc câmpurile noi. */
function migrateFirm<T extends object>(firm: T): T {
  const old = firm as LegacyFirm
  if (old.cui !== undefined) return firm
  const { idno = '', vatCode = '', ...rest } = old
  return { ...rest, cui: idno, regCom: vatCode } as T
}

function migrate(state: DemoState): DemoState {
  return {
    ...state,
    profiles: Object.fromEntries(Object.entries(state.profiles).map(([id, p]) => [id, migrateFirm(p)])),
    orders: state.orders.map((o) => ({ ...o, draft: { ...o.draft, client: migrateFirm(o.draft.client) } })),
  }
}

function load(): DemoState {
  try {
    const saved = localStorage.getItem(KEY)
    // câmpurile noi lipsesc din datele salvate de versiunile anterioare
    if (saved) return migrate({ ...emptyState(), ...(JSON.parse(saved) as Partial<DemoState>) })
    // comenzile făcute înainte de cabinet rămân vizibile în panoul de administrare
    const legacy = JSON.parse(localStorage.getItem('slavic.orders') ?? '[]') as SavedOrder[]
    return {
      ...emptyState(),
      orders: legacy.map((o) => ({
        ...o,
        id: crypto.randomUUID(),
        userId: null,
        status: 'noua',
        events: [{ status: 'noua', note: '', at: o.issuedAt }],
      })),
      counter: Number(localStorage.getItem('slavic.invoiceCounter') ?? '0'),
    }
  } catch {
    return emptyState()
  }
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Fișierul nu a putut fi citit.'))
    reader.readAsDataURL(file)
  })
}

// o singură copie a datelor pentru ambele sesiuni (cont și panou), ca să vadă aceleași comenzi
let shared: DemoState | null = null

export function createDemoBackend(scope: BackendScope): Backend {
  const state = (shared ??= load())
  const sessionKey = scope === 'admin' ? 'adminSession' : 'session'
  const asAdmin = scope === 'admin'
  const listeners = new Set<(user: AccountUser | null, event: AuthEvent) => void>()

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      throw new Error('Spațiul din browser e plin. Ștergeți câteva documente de probă.')
    }
  }
  const me = (): AccountUser | null => {
    const user = state.users.find((u) => u.id === state[sessionKey])
    return user ? { id: user.id, email: user.email, isAdmin: asAdmin && user.admin === true } : null
  }
  const requireUser = () => {
    const user = me()
    if (!user) throw new Error('Intrați în cont.')
    return user
  }
  const notify = (event: AuthEvent) => listeners.forEach((l) => l(me(), event))
  const nextNumber = () => {
    state.counter += 1
    return `${invoicePrefix}-${new Date().getFullYear()}-${String(state.counter).padStart(4, '0')}`
  }

  return {
    mode: 'demo',

    async currentUser() {
      return me()
    },

    onAuthChange(callback) {
      listeners.add(callback)
      const user = me()
      setTimeout(() => callback(user, user ? 'signed-in' : 'signed-out'))
      return () => listeners.delete(callback)
    },

    async signUp(email, password, profile) {
      const normalized = email.trim().toLowerCase()
      if (state.users.some((u) => u.email === normalized && !u.admin)) {
        throw new Error('Există deja un cont cu acest e-mail. Intrați în cont sau resetați parola.')
      }
      const user = { id: crypto.randomUUID(), email: normalized, password, createdAt: new Date().toISOString() }
      state.users.push(user)
      state.profiles[user.id] = { ...profile, email: profile.email || normalized }
      state[sessionKey] = user.id
      save()
      notify('signed-in')
      return { needsConfirmation: false }
    },

    async signIn(email, password) {
      // Fără verificare: orice e-mail și orice parolă deschid un cont. Clienții noi primesc date de probă;
      // din panoul admin se deschide un cont de administrator (fără date proprii, vede comenzile tuturor).
      const normalized = email.trim().toLowerCase() || (asAdmin ? DEMO_ADMIN_EMAIL : DEMO_EMAIL)
      let user = state.users.find((u) => u.email === normalized && !!u.admin === asAdmin)
      if (!user) {
        user = { id: crypto.randomUUID(), email: normalized, password, createdAt: new Date().toISOString(), admin: asAdmin }
        state.users.push(user)
        if (!asAdmin) {
          const sample = sampleAccount(user.id, normalized, nextNumber)
          state.profiles[user.id] = sample.profile
          state.addresses[user.id] = sample.addresses
          state.orders.push(...sample.orders)
          state.documents.push(...sample.documents)
        } else if (state.users.filter((u) => !u.admin).length < 3) {
          // ca panoul să nu fie gol: câteva firme de probă, cu comenzi în următoarele zile
          for (const c of sampleClients(nextNumber)) {
            state.users.push(c.user)
            state.profiles[c.user.id] = c.profile
            state.orders.push(...c.orders)
          }
          state.messages.push(...sampleMessages())
        }
      }
      state[sessionKey] = user.id
      save()
      notify('signed-in')
    },

    async signOut() {
      state[sessionKey] = null
      save()
      notify('signed-out')
    },

    async sendPasswordReset() {
      // în modul demonstrativ nu se trimit e-mailuri
    },

    async updatePassword(password) {
      const user = state.users.find((u) => u.id === requireUser().id)
      if (user) user.password = password
      save()
    },

    async getProfile() {
      return state.profiles[requireUser().id] ?? null
    },

    async saveProfile(profile) {
      state.profiles[requireUser().id] = profile
      save()
    },

    async listAddresses() {
      return state.addresses[requireUser().id] ?? []
    },

    async saveAddress({ id, ...address }) {
      const owner = requireUser().id
      let list = state.addresses[owner] ?? []
      if (address.isDefault) list = list.map((a) => ({ ...a, isDefault: false }))
      list = id ? list.map((a) => (a.id === id ? { id, ...address } : a)) : [...list, { id: crypto.randomUUID(), ...address }]
      state.addresses[owner] = list
      save()
    },

    async deleteAddress(id) {
      const owner = requireUser().id
      state.addresses[owner] = (state.addresses[owner] ?? []).filter((a) => a.id !== id)
      save()
    },

    async bookedCounts() {
      const counts: Record<string, number> = {}
      for (const order of state.orders) {
        if (order.draft.date && order.status !== 'anulata') counts[order.draft.date] = (counts[order.draft.date] ?? 0) + 1
      }
      return counts
    },

    async closedDays() {
      const today = toIsoDate(new Date())
      return state.closedDays.filter((d) => d.day >= today).sort((a, b) => a.day.localeCompare(b.day))
    },

    async createOrder(draft, quote) {
      const issuedAt = new Date().toISOString()
      const order: OrderRecord = {
        id: crypto.randomUUID(),
        number: nextNumber(),
        issuedAt,
        draft,
        quote,
        userId: me()?.id ?? null,
        status: 'noua',
        events: [{ status: 'noua', note: '', at: issuedAt }],
      }
      state.orders.push(order)
      save()
      return order
    },

    async listMyOrders() {
      const owner = requireUser().id
      return state.orders.filter((o) => o.userId === owner).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    },

    async listMyDocuments() {
      const owner = requireUser().id
      return state.documents.filter((d) => d.userId === owner).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async documentUrl(document) {
      return document.filePath
    },

    async sendMessage(message) {
      state.messages.push({ ...message, id: crypto.randomUUID(), createdAt: new Date().toISOString(), handled: false })
      save()
    },

    admin: {
      async listOrders() {
        return [...state.orders].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
      },

      async setOrderStatus(orderId, status, note) {
        const order = state.orders.find((o) => o.id === orderId)
        if (!order) throw new Error('Comanda nu mai există.')
        order.status = status
        order.events.push({ status, note, at: new Date().toISOString() })
        save()
      },

      async rescheduleOrder(orderId, day, note) {
        const order = state.orders.find((o) => o.id === orderId)
        if (!order) throw new Error('Comanda nu mai există.')
        order.draft = { ...order.draft, date: day }
        const [y, m, d] = day.split('-')
        order.events.push({ status: order.status, note: note || `Data mutată pe ${d}.${m}.${y}`, at: new Date().toISOString() })
        save()
      },

      async setDayClosed(day, closed, reason) {
        state.closedDays = state.closedDays.filter((d) => d.day !== day)
        if (closed) state.closedDays.push({ day, reason })
        save()
      },

      async listNotes() {
        return { ...state.notes }
      },

      async saveNote(orderId, note) {
        state.notes[orderId] = note
        save()
      },

      async listClients() {
        return state.users
          .map((u) => ({ userId: u.id, profile: state.profiles[u.id], createdAt: u.createdAt }))
          .filter((c) => c.profile)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      },

      async listMessages() {
        return [...state.messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      },

      async setMessageHandled(id, handled) {
        const message = state.messages.find((m) => m.id === id)
        if (message) message.handled = handled
        save()
      },

      async listDocuments() {
        return [...state.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      },

      async uploadDocument({ userId, orderNumber, kind, title, file }) {
        if (file.size > MAX_FILE) throw new Error('În modul demonstrativ fișierele pot avea cel mult 3 MB.')
        state.documents.push({
          id: crypto.randomUUID(),
          userId,
          orderNumber,
          kind,
          title,
          fileName: file.name,
          filePath: await readFile(file),
          createdAt: new Date().toISOString(),
        })
        save()
      },

      async deleteDocument(document) {
        state.documents = state.documents.filter((d) => d.id !== document.id)
        save()
      },
    },
  }
}

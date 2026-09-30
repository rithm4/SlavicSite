// Conturi, comenzi și documente pe Supabase. Structura bazei de date e în supabase/schema.sql.
import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import type { OrderDraft, Quote } from '../types'
import { hashParams } from '../useRoute'
import type {
  AccountUser,
  Backend,
  BackendScope,
  CompanyProfile,
  DocumentKind,
  DocumentRecord,
  OrderRecord,
  OrderStatus,
} from './types'

const BUCKET = 'documents'

interface ProfileRow {
  id: string
  name: string
  cui: string
  reg_com: string
  contact_person: string
  phone: string
  email: string
  address: string
  created_at: string
}

interface OrderRow {
  id: string
  number: string
  user_id: string | null
  issued_at: string
  draft: OrderDraft
  quote: Quote
  status: OrderStatus
  order_events?: { status: OrderStatus; note: string; created_at: string }[]
}

interface DocumentRow {
  id: string
  user_id: string
  order_number: string | null
  kind: DocumentKind
  title: string
  file_path: string
  file_name: string
  created_at: string
}

const toProfile = (r: ProfileRow): CompanyProfile => ({
  name: r.name,
  cui: r.cui,
  regCom: r.reg_com,
  contactPerson: r.contact_person,
  phone: r.phone,
  email: r.email,
  address: r.address,
})

const fromProfile = (p: CompanyProfile) => ({
  name: p.name,
  cui: p.cui,
  reg_com: p.regCom,
  contact_person: p.contactPerson,
  phone: p.phone,
  email: p.email,
  address: p.address,
})

const toOrder = (r: OrderRow): OrderRecord => ({
  id: r.id,
  number: r.number,
  userId: r.user_id,
  issuedAt: r.issued_at,
  draft: r.draft,
  quote: r.quote,
  status: r.status,
  events: (r.order_events ?? [])
    .map((e) => ({ status: e.status, note: e.note, at: e.created_at }))
    .sort((a, b) => a.at.localeCompare(b.at)),
})

const toDocument = (r: DocumentRow): DocumentRecord => ({
  id: r.id,
  userId: r.user_id,
  orderNumber: r.order_number,
  kind: r.kind,
  title: r.title,
  fileName: r.file_name,
  filePath: r.file_path,
  createdAt: r.created_at,
})

const ORDER_COLUMNS = 'id, number, user_id, issued_at, draft, quote, status, order_events(status, note, created_at)'

/** Mesajele serverului, pe înțelesul clientului. */
function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mailul sau parola nu sunt corecte.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Există deja un cont cu acest e-mail. Intrați în cont sau resetați parola.'
  if (m.includes('email not confirmed')) return 'Confirmați întâi adresa de e-mail, din mesajul primit la înregistrare.'
  if (m.includes('password should be') || m.includes('weak password')) return 'Parola trebuie să aibă cel puțin 8 caractere.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Prea multe încercări. Reîncercați peste câteva minute.'
  if (m.includes('different from the old')) return 'Parola nouă trebuie să fie diferită de cea veche.'
  return `A apărut o eroare: ${message}`
}

type DataOf<R> = R extends { data: infer D } ? D : never

/** Aruncă eroarea serverului (tradusă) sau întoarce datele răspunsului. */
function check<R extends { error: { message: string } | null }>(result: R): DataOf<R> {
  if (result.error) throw new Error(friendly(result.error.message))
  return (result as unknown as { data: DataOf<R> }).data
}

/** Adresa la care revine clientul din e-mailurile de confirmare și de resetare a parolei. */
const returnUrl = (hash: string) => `${location.origin}${location.pathname}${hash}`

export async function createSupabaseBackend(url: string, anonKey: string, scope: BackendScope): Promise<Backend> {
  const isAdminScope = scope === 'admin'
  // panoul admin își ține sesiunea sub altă cheie, ca să nu se amestece cu contul de client din același browser
  const supabase = createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: isAdminScope ? 'eurovypcuc-admin-auth' : 'eurovypcuc-auth',
    },
  })
  const home = isAdminScope ? '#/admin' : '#/cont'

  // Linkurile din e-mail aduc ?code=…, pe care îl schimbă pe o sesiune clientul Supabase care l-a cerut
  // (cel al panoului pentru #/admin, cel al contului în rest); resetarea parolei are și ?reset=1.
  const forThisScope = location.hash.startsWith('#/admin') === isAdminScope
  let recovery = forThisScope && hashParams().get('reset') === '1'
  const code = new URLSearchParams(location.search).get('code')
  if (code && forThisScope) {
    await supabase.auth.exchangeCodeForSession(code).catch(() => undefined)
    history.replaceState(null, '', `${location.pathname}${location.hash || home}`)
  }

  let adminOf: { id: string; value: boolean } | null = null
  const toUser = async (session: Session | null): Promise<AccountUser | null> => {
    if (!session) return null
    const { user } = session
    if (isAdminScope && adminOf?.id !== user.id) {
      const { data } = await supabase.rpc('is_admin')
      adminOf = { id: user.id, value: data === true }
    }
    return { id: user.id, email: user.email ?? '', isAdmin: isAdminScope && adminOf?.value === true }
  }
  const userId = async () => {
    const { data } = await supabase.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new Error('Sesiunea a expirat. Intrați din nou în cont.')
    return id
  }

  return {
    mode: 'supabase',

    async currentUser() {
      const { data } = await supabase.auth.getSession()
      return toUser(data.session)
    },

    onAuthChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const isRecovery = event === 'PASSWORD_RECOVERY' || (recovery && !!session)
        if (isRecovery) recovery = false
        // apelul la server nu se face în interiorul evenimentului, ca să nu blocheze clientul Supabase
        setTimeout(() => {
          void toUser(session).then((user) =>
            callback(user, isRecovery ? 'recovery' : user ? 'signed-in' : 'signed-out'),
          )
        })
      })
      return () => data.subscription.unsubscribe()
    },

    async signUp(email, password, profile) {
      const data = check(
        await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: returnUrl('#/cont'), data: fromProfile(profile) },
        }),
      )
      return { needsConfirmation: !data.session }
    },

    async signIn(email, password) {
      check(await supabase.auth.signInWithPassword({ email, password }))
    },

    async signOut() {
      await supabase.auth.signOut()
    },

    async sendPasswordReset(email) {
      check(await supabase.auth.resetPasswordForEmail(email, { redirectTo: returnUrl(`${home}?reset=1`) }))
    },

    async updatePassword(password) {
      check(await supabase.auth.updateUser({ password }))
    },

    async getProfile() {
      const row = check(await supabase.from('profiles').select('*').eq('id', await userId()).maybeSingle())
      return row ? toProfile(row as ProfileRow) : null
    },

    async saveProfile(profile) {
      check(
        await supabase
          .from('profiles')
          .update({ ...fromProfile(profile), updated_at: new Date().toISOString() })
          .eq('id', await userId()),
      )
    },

    async listAddresses() {
      const rows = check(await supabase.from('addresses').select('*').order('created_at'))
      return (rows as { id: string; label: string; address: string; is_default: boolean }[]).map((r) => ({
        id: r.id,
        label: r.label,
        address: r.address,
        isDefault: r.is_default,
      }))
    },

    async saveAddress({ id, label, address, isDefault }) {
      const owner = await userId()
      if (isDefault) check(await supabase.from('addresses').update({ is_default: false }).eq('user_id', owner))
      const row = { label, address, is_default: isDefault, user_id: owner }
      check(id ? await supabase.from('addresses').update(row).eq('id', id) : await supabase.from('addresses').insert(row))
    },

    async deleteAddress(id) {
      check(await supabase.from('addresses').delete().eq('id', id))
    },

    async bookedCounts() {
      const rows = check(await supabase.rpc('booked_counts')) as { day: string; orders: number }[] | null
      return Object.fromEntries((rows ?? []).map((r) => [r.day, Number(r.orders)]))
    },

    async closedDays() {
      const today = new Date().toISOString().slice(0, 10)
      const rows = check(await supabase.from('closed_days').select('day, reason').gte('day', today).order('day'))
      return (rows ?? []) as { day: string; reason: string }[]
    },

    async createOrder(draft, quote) {
      const row = check(await supabase.rpc('create_order', { p_draft: draft, p_quote: quote })) as OrderRow
      return { number: row.number, issuedAt: row.issued_at, draft: row.draft, quote: row.quote }
    },

    async listMyOrders() {
      const rows = check(
        await supabase.from('orders').select(ORDER_COLUMNS).eq('user_id', await userId()).order('issued_at', { ascending: false }),
      )
      return (rows as OrderRow[]).map(toOrder)
    },

    async listMyDocuments() {
      const rows = check(
        await supabase.from('documents').select('*').eq('user_id', await userId()).order('created_at', { ascending: false }),
      )
      return (rows as DocumentRow[]).map(toDocument)
    },

    async documentUrl(document) {
      const data = check(await supabase.storage.from(BUCKET).createSignedUrl(document.filePath, 300, { download: document.fileName }))
      if (!data) throw new Error('Documentul nu mai este disponibil.')
      return data.signedUrl
    },

    async sendMessage({ name, company, contact, text }) {
      check(await supabase.from('messages').insert({ name, company, contact, body: text }))
    },

    admin: {
      async listOrders() {
        const rows = check(await supabase.from('orders').select(ORDER_COLUMNS).order('issued_at', { ascending: false }).limit(500))
        return (rows as OrderRow[]).map(toOrder)
      },

      async setOrderStatus(orderId, status, note) {
        check(await supabase.rpc('set_order_status', { p_order: orderId, p_status: status, p_note: note }))
      },

      async rescheduleOrder(orderId, day, note) {
        check(await supabase.rpc('reschedule_order', { p_order: orderId, p_date: day, p_note: note }))
      },

      async setDayClosed(day, closed, reason) {
        check(
          closed
            ? await supabase.from('closed_days').upsert({ day, reason })
            : await supabase.from('closed_days').delete().eq('day', day),
        )
      },

      async listNotes() {
        const rows = check(await supabase.from('order_notes').select('order_id, note')) as { order_id: string; note: string }[] | null
        return Object.fromEntries((rows ?? []).map((r) => [r.order_id, r.note]))
      },

      async saveNote(orderId, note) {
        check(await supabase.from('order_notes').upsert({ order_id: orderId, note, updated_at: new Date().toISOString() }))
      },

      async listClients() {
        const rows = check(await supabase.from('profiles').select('*').order('created_at', { ascending: false }))
        return (rows as ProfileRow[]).map((r) => ({ userId: r.id, profile: toProfile(r), createdAt: r.created_at }))
      },

      async listMessages() {
        const rows = check(await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(300)) as
          | { id: string; name: string; company: string; contact: string; body: string; created_at: string; handled: boolean }[]
          | null
        return (rows ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          company: r.company,
          contact: r.contact,
          text: r.body,
          createdAt: r.created_at,
          handled: r.handled,
        }))
      },

      async setMessageHandled(id, handled) {
        check(await supabase.from('messages').update({ handled }).eq('id', id))
      },

      async listDocuments() {
        const rows = check(await supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(500))
        return (rows as DocumentRow[]).map(toDocument)
      },

      async uploadDocument({ userId: owner, orderNumber, kind, title, file }) {
        const safeName = file.name.normalize('NFD').replace(/[^\w.-]+/g, '_')
        const path = `${owner}/${crypto.randomUUID()}-${safeName}`
        check(await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined }))
        check(
          await supabase.from('documents').insert({
            user_id: owner,
            order_number: orderNumber,
            kind,
            title,
            file_path: path,
            file_name: file.name,
          }),
        )
      },

      async deleteDocument(document) {
        check(await supabase.storage.from(BUCKET).remove([document.filePath]))
        check(await supabase.from('documents').delete().eq('id', document.id))
      },
    },
  }
}

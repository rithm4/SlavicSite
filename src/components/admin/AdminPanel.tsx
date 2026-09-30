import { LogOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount } from '../../lib/account'
import type { ClientRecord, ClosedDay, ContactMessage, DocumentRecord, OrderRecord } from '../../lib/backend/types'
import { useKeepInView } from '../../lib/useKeepInView'
import { useHashParam } from '../../lib/useRoute'
import { Notice } from '../account/shared'
import { errorText } from '../account/util'
import { AdminCalendar } from './AdminCalendar'
import { AdminClients } from './AdminClients'
import { AdminDocuments } from './AdminDocuments'
import { AdminMessages } from './AdminMessages'
import { AdminOrders } from './AdminOrders'
import { AdminOverview } from './AdminOverview'
import { alertsFor, isActive } from './helpers'

export interface AdminData {
  orders: OrderRecord[]
  clients: ClientRecord[]
  documents: DocumentRecord[]
  closedDays: ClosedDay[]
  /** notele interne ale echipei, după id-ul comenzii */
  notes: Record<string, string>
  /** mesajele din pagina de contacte */
  messages: ContactMessage[]
  loading: boolean
  reload(): void
}

export function AdminPanel() {
  const { backend, user } = useAccount()
  const section = useHashParam('sectiune') ?? 'prezentare'
  const panelRef = useRef<HTMLDivElement>(null)
  useKeepInView(panelRef, section)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!backend) return
    let cancelled = false
    Promise.all([
      backend.admin.listOrders(),
      backend.admin.listClients(),
      backend.admin.listDocuments(),
      backend.closedDays(),
      backend.admin.listNotes(),
      backend.admin.listMessages(),
    ])
      .then(([o, c, d, closed, n, m]) => {
        if (cancelled) return
        setOrders(o)
        setClients(c)
        setDocuments(d)
        setClosedDays(closed)
        setNotes(n)
        setMessages(m)
        setError(null)
      })
      .catch((e: unknown) => !cancelled && setError(errorText(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [backend, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const data: AdminData = { orders, clients, documents, closedDays, notes, messages, loading, reload }
  const alerts = alertsFor(orders).length
  const unread = messages.filter((m) => !m.handled).length

  const tabs = [
    { id: 'prezentare', label: 'Prezentare', count: alerts, warn: alerts > 0 },
    { id: 'calendar', label: 'Calendar', count: null, warn: false },
    { id: 'comenzi', label: 'Comenzi', count: orders.filter(isActive).length, warn: false },
    { id: 'mesaje', label: 'Mesaje', count: unread, warn: unread > 0 },
    { id: 'clienti', label: 'Clienți', count: clients.length, warn: false },
    { id: 'documente', label: 'Documente', count: documents.length, warn: false },
  ]

  return (
    <div className="admin" ref={panelRef}>
      {backend?.mode === 'demo' && (
        <p className="demo-note">
          Mod demonstrativ: datele sunt doar în acest browser. Cu Supabase, în panou intră doar conturile trecute ca
          administratori.
        </p>
      )}
      <div className="admin-bar">
        <span className="muted">
          Administrator: <strong>{user?.email}</strong>
        </span>
        <button type="button" className="btn-link btn-icon" onClick={() => void backend?.signOut()}>
          <LogOut size={16} aria-hidden="true" />
          Ieșire din panou
        </button>
      </div>
      <nav className="admin-tabs" aria-label="Secțiunile panoului">
        {tabs.map((t) => (
          <a key={t.id} href={`#/admin?sectiune=${t.id}`} aria-current={section === t.id ? 'page' : undefined}>
            {t.label}
            {t.count !== null && <span className={t.warn ? 'is-warn' : ''}>{t.count}</span>}
          </a>
        ))}
      </nav>
      {error && <Notice kind="error">{error}</Notice>}
      {section === 'prezentare' && <AdminOverview data={data} />}
      {section === 'calendar' && <AdminCalendar data={data} />}
      {section === 'comenzi' && <AdminOrders data={data} />}
      {section === 'mesaje' && <AdminMessages data={data} />}
      {section === 'clienti' && <AdminClients data={data} />}
      {section === 'documente' && <AdminDocuments data={data} />}
    </div>
  )
}

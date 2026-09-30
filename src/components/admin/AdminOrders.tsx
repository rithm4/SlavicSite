import { ChevronDown, Download, FileDown, Mail, Phone, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { currency } from '../../config/company'
import { useAccount } from '../../lib/account'
import { orderStatuses, statusLabel } from '../../lib/backend/types'
import type { OrderRecord, OrderStatus } from '../../lib/backend/types'
import { formatDateRo } from '../../lib/dates'
import { downloadInvoice } from '../../lib/download'
import { formatMoney, formatPallets } from '../../lib/format'
import { useHashParam } from '../../lib/useRoute'
import { Notice, OrderDetails, StatusBadge } from '../account/shared'
import { dateOf, errorText } from '../account/util'
import type { AdminData } from './AdminPanel'
import { exportCsv, paymentDue, shortDate } from './helpers'
import { InternalNote, KindTag, OrderQuickActions } from './OrderActions'

type Filter = OrderStatus | 'toate'

export function AdminOrders({ data }: { data: AdminData }) {
  const { orders, loading, notes } = data
  const wanted = useHashParam('comanda')
  const fromLink = useHashParam('status') as Filter | null
  const [filter, setFilter] = useState<Filter>(fromLink ?? 'toate')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const visible = orders.filter(
    (o) =>
      (filter === 'toate' || o.status === filter) &&
      (!q ||
        [o.number, o.draft.client.name, o.draft.client.cui, o.draft.client.phone, o.draft.deliveryAddress].some((v) =>
          v.toLowerCase().includes(q),
        )),
  )
  const count = (s: Filter) => (s === 'toate' ? orders.length : orders.filter((o) => o.status === s).length)

  return (
    <section className="admin-section">
      <div className="admin-filters">
        <div className="chips" role="group" aria-label="Filtru după status">
          {(['toate', ...orderStatuses.map((s) => s.id)] as Filter[]).map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s === 'toate' ? 'Toate' : statusLabel(s)}
              <span>{count(s)}</span>
            </button>
          ))}
        </div>
        <div className="admin-tools">
          <label className="search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Număr, firmă, CUI, telefon, adresă"
              aria-label="Caută comenzi"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn secondary btn-icon"
            disabled={visible.length === 0}
            title="Comenzile din listă, pentru Excel"
            onClick={() => exportCsv(visible)}
          >
            <Download size={16} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="muted">{loading ? 'Se încarcă…' : 'Nicio comandă pentru acest filtru.'}</p>
      ) : (
        <ul className="order-cards">
          {visible.map((o) => (
            <AdminOrder key={o.id} order={o} note={notes[o.id] ?? ''} focus={o.id === wanted} onChanged={data.reload} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AdminOrder({
  order,
  note: internal,
  focus,
  onChanged,
}: {
  order: OrderRecord
  note: string
  focus: boolean
  onChanged(): void
}) {
  const { backend } = useAccount()
  const [open, setOpen] = useState(focus)
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const ref = useRef<HTMLLIElement>(null)
  const c = order.draft.client
  const due = paymentDue(order)
  const overdue = order.status === 'noua' && due < new Date()

  // venit dintr-un link (prezentare, calendar): comanda se deschide și se aduce în ecran
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])

  const save = async () => {
    if (!backend) return
    setBusy(true)
    setMessage(null)
    try {
      await backend.admin.setOrderStatus(order.id, status, note.trim())
      setNote('')
      setMessage({ kind: 'ok', text: `Salvat: comanda e acum „${statusLabel(status)}”. Clientul vede schimbarea în cont.` })
      onChanged()
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <li ref={ref} className={open ? 'order-card is-open' : 'order-card'}>
      <button type="button" className="order-card-head admin-order-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="order-card-id">
          <strong>{order.number}</strong>
          <span className="muted">{dateOf(order.issuedAt)}</span>
        </span>
        <span className="admin-order-client">
          {c.name}
          <span className="muted">
            {order.draft.date ? `${order.draft.deliveryMethod === 'delivery' ? 'livrare' : 'ridicare'} ${shortDate(order.draft.date)}` : ''}
            {!order.userId && ' · fără cont'}
            {internal && ' · are notă'}
          </span>
        </span>
        <StatusBadge status={order.status} />
        <span className="order-card-total">
          {formatMoney(order.quote.total)} {currency}
        </span>
        <ChevronDown size={18} aria-hidden="true" className="order-card-chevron" />
      </button>

      {open && (
        <div className="order-card-body">
          <div className="admin-client">
            <div>
              <span className="muted">Firma</span>
              <strong>{c.name}</strong>
              <span>CUI {c.cui}</span>
            </div>
            <div>
              <span className="muted">Contact{c.contactPerson ? `: ${c.contactPerson}` : ''}</span>
              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="contact-link">
                <Phone size={14} aria-hidden="true" />
                {c.phone}
              </a>
              <a href={`mailto:${c.email}?subject=${encodeURIComponent(`Comanda ${order.number}`)}`} className="contact-link">
                <Mail size={14} aria-hidden="true" />
                {c.email}
              </a>
            </div>
            <div>
              <span className="muted">Programare</span>
              <span className="admin-when">
                <KindTag order={order} />
                {order.draft.date ? shortDate(order.draft.date) : '—'}
              </span>
              <span className="muted">≈ {formatPallets(order.quote.totalPallets)}</span>
            </div>
            <div>
              <span className="muted">Plata</span>
              {order.status === 'noua' ? (
                <span className={overdue ? 'due is-overdue' : 'due'}>
                  {overdue ? 'Termen depășit: ' : 'Termen: '}
                  {formatDateRo(due)}
                </span>
              ) : (
                <span>{order.status === 'anulata' ? 'Anulată' : 'Primită'}</span>
              )}
            </div>
          </div>

          <OrderDetails order={order} />

          <InternalNote order={order} value={internal} onSaved={onChanged} />

          <div className="status-form">
            <label className="field">
              <span>Status nou</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                {orderStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Mesaj pentru client (opțional)</span>
              <input
                type="text"
                value={note}
                placeholder="ex. Plata primită pe 02.10"
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button type="button" className="btn" disabled={busy || (status === order.status && !note.trim())} onClick={() => void save()}>
              {busy ? 'Se salvează…' : 'Salvează statusul'}
            </button>
            <button type="button" className="btn secondary btn-icon" onClick={() => void downloadInvoice(order)}>
              <FileDown size={16} aria-hidden="true" />
              Proforma
            </button>
          </div>
          {message && <Notice kind={message.kind}>{message.text}</Notice>}

          <OrderQuickActions order={order} onChanged={onChanged} />
        </div>
      )}
    </li>
  )
}

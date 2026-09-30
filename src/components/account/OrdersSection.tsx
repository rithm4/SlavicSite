import { ChevronDown, FileDown, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { currency } from '../../config/company'
import type { OrderRecord } from '../../lib/backend/types'
import { downloadInvoice } from '../../lib/download'
import { repeatOrder } from '../../lib/draft'
import { formatMoney } from '../../lib/format'
import { href, useHashParam } from '../../lib/useRoute'
import type { CabinetData } from './Cabinet'
import { OrderDetails, StatusBadge } from './shared'
import { dateOf } from './util'

export function OrdersSection({ data }: { data: CabinetData }) {
  const { orders, loading } = data
  // comanda cerută din prezentare (…&comanda=id) sau, altfel, cea mai recentă se deschide singură
  const wanted = useHashParam('comanda')
  const openId = wanted ?? orders[0]?.id
  return (
    <section className="cab-section">
      <header className="cab-head">
        <div>
          <h2>Comenzi</h2>
          <p className="muted">Apăsați pe o comandă ca să vedeți produsele și statusul ei.</p>
        </div>
        <a className="btn" href={href('comanda')}>
          Comandă nouă
        </a>
      </header>
      {orders.length === 0 ? (
        <p className="muted">
          {loading ? 'Se încarcă…' : 'Comenzile făcute cât sunteți în cont apar aici, cu statusul lor.'}
        </p>
      ) : (
        <ul className="order-cards">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} initiallyOpen={order.id === openId} focus={order.id === wanted} />
          ))}
        </ul>
      )}
    </section>
  )
}

function OrderCard({ order, initiallyOpen, focus }: { order: OrderRecord; initiallyOpen: boolean; focus: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLLIElement>(null)

  // venit din prezentare: comanda aleasă se aduce în ecran, dacă nu se vede deja
  useEffect(() => {
    const el = ref.current
    if (!focus || !el) return
    const { top, bottom } = el.getBoundingClientRect()
    if (top < 80 || bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])

  const download = async () => {
    setBusy(true)
    try {
      await downloadInvoice(order)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li ref={ref} className={open ? 'order-card is-open' : 'order-card'}>
      <button type="button" className="order-card-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="order-card-id">
          <strong>{order.number}</strong>
          <span className="muted">din {dateOf(order.issuedAt)}</span>
        </span>
        <StatusBadge status={order.status} />
        <span className="order-card-total">
          {formatMoney(order.quote.total)} {currency}
        </span>
        <ChevronDown size={18} aria-hidden="true" className="order-card-chevron" />
      </button>
      {open && (
        <div className="order-card-body">
          <OrderDetails order={order} />
          <div className="order-card-actions">
            <button type="button" className="btn secondary btn-icon" onClick={() => void download()} disabled={busy}>
              <FileDown size={16} aria-hidden="true" />
              {busy ? 'Se pregătește…' : 'Factura proformă (PDF)'}
            </button>
            <button type="button" className="btn secondary btn-icon" onClick={() => repeatOrder(order.draft)}>
              <RotateCcw size={16} aria-hidden="true" />
              Repetă comanda
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

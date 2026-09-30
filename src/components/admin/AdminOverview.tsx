import { AlertTriangle, ArrowRight } from 'lucide-react'
import { currency } from '../../config/company'
import type { OrderRecord } from '../../lib/backend/types'
import { formatMoney, formatPallets } from '../../lib/format'
import { StatusBadge } from '../account/shared'
import type { AdminData } from './AdminPanel'
import { alertsFor, dayLabel, inDaysIso, isActive, ordersOn, todayIso } from './helpers'
import { KindTag, OrderQuickActions } from './OrderActions'

const orderLink = (o: OrderRecord) => `#/admin?sectiune=comenzi&comanda=${o.id}`

function summary(list: OrderRecord[]) {
  const delivery = list.filter((o) => o.draft.deliveryMethod === 'delivery').length
  const parts = [delivery && `${delivery} ${delivery === 1 ? 'livrare' : 'livrări'}`, list.length - delivery && `${list.length - delivery} ${list.length - delivery === 1 ? 'ridicare' : 'ridicări'}`]
  return parts.filter(Boolean).join(' · ') || 'nimic programat'
}

export function AdminOverview({ data }: { data: AdminData }) {
  const { orders, loading, reload } = data
  const active = orders.filter(isActive)
  const today = todayIso()
  const tomorrow = inDaysIso(1)
  const todays = ordersOn(active, today)
  const tomorrows = ordersOn(active, tomorrow)
  const unpaid = active.filter((o) => o.status === 'noua')
  const month = new Date().toISOString().slice(0, 7)
  const thisMonth = active.filter((o) => o.issuedAt.slice(0, 7) === month)
  const alerts = alertsFor(orders)
  const sum = (list: OrderRecord[]) => formatMoney(list.reduce((s, o) => s + o.quote.total, 0))

  // programul pe următoarele 10 zile, doar zilele cu comenzi
  const agenda = Array.from({ length: 10 }, (_, i) => inDaysIso(i))
    .map((day) => ({ day, list: ordersOn(active, day) }))
    .filter((d) => d.list.length > 0)

  if (loading) return <p className="muted">Se încarcă…</p>

  return (
    <section className="admin-section">
      <div className="cab-stats">
        <a className="cab-stat" href={`#/admin?sectiune=calendar&zi=${today}`}>
          <span>Azi</span>
          <strong>{todays.length}</strong>
          <small className="muted">{summary(todays)}</small>
        </a>
        <a className="cab-stat" href={`#/admin?sectiune=calendar&zi=${tomorrow}`}>
          <span>Mâine</span>
          <strong>{tomorrows.length}</strong>
          <small className="muted">{summary(tomorrows)}</small>
        </a>
        <a className="cab-stat" href="#/admin?sectiune=comenzi&status=noua">
          <span>Așteaptă plata</span>
          <strong>{unpaid.length}</strong>
          <small className="muted">
            {sum(unpaid)} {currency}
          </small>
        </a>
        <div className="cab-stat">
          <span>Comenzi luna aceasta</span>
          <strong>{thisMonth.length}</strong>
          <small className="muted">
            {sum(thisMonth)} {currency}
          </small>
        </div>
      </div>

      <div className="cab-block">
        <div className="cab-block-head">
          <h3>De rezolvat</h3>
          {alerts.length > 0 && <span className="count-pill">{alerts.length}</span>}
        </div>
        {alerts.length === 0 ? (
          <p className="muted">Totul e în ordine: nicio plată întârziată și nicio dată depășită.</p>
        ) : (
          <ul className="alert-list">
            {alerts.map((a) => (
              <li key={`${a.kind}-${a.order.id}`} className={`alert-${a.kind}`}>
                <AlertTriangle size={18} aria-hidden="true" />
                <div className="alert-body">
                  <p>
                    <a href={orderLink(a.order)}>
                      <strong>{a.order.number}</strong>
                    </a>{' '}
                    · {a.order.draft.client.name}
                    <span className="muted">
                      {' '}
                      · {formatMoney(a.order.quote.total)} {currency}
                    </span>
                  </p>
                  <p className="muted">{a.text}</p>
                  {a.kind !== 'past-date' && <OrderQuickActions order={a.order} onChanged={reload} />}
                  {a.kind === 'past-date' && (
                    <a className="btn-link btn-icon" href={orderLink(a.order)}>
                      Deschide comanda
                      <ArrowRight size={14} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cab-block">
        <div className="cab-block-head">
          <h3>Programul zilelor următoare</h3>
          <a className="btn-link" href="#/admin?sectiune=calendar">
            Calendarul complet
          </a>
        </div>
        {agenda.length === 0 ? (
          <p className="muted">Nicio livrare sau ridicare în următoarele 10 zile.</p>
        ) : (
          <div className="agenda">
            {agenda.map(({ day, list }) => (
              <div key={day} className="agenda-day">
                <h4>
                  {day === today ? 'Azi, ' : day === tomorrow ? 'Mâine, ' : ''}
                  {dayLabel(day)}
                  <span className="muted"> · {summary(list)}</span>
                </h4>
                <ul>
                  {list.map((o) => (
                    <li key={o.id}>
                      <a href={orderLink(o)}>
                        <KindTag order={o} />
                        <strong>{o.number}</strong>
                        <span className="agenda-client">{o.draft.client.name}</span>
                        <span className="muted agenda-where">
                          {o.draft.deliveryMethod === 'delivery' ? o.draft.deliveryAddress : 'de la sediu'}
                        </span>
                        <span className="muted">≈ {formatPallets(o.quote.totalPallets)}</span>
                        <StatusBadge status={o.status} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

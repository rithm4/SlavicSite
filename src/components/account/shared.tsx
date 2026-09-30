import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { currency } from '../../config/company'
import { orderStatuses, statusLabel } from '../../lib/backend/types'
import type { OrderRecord, OrderStatus } from '../../lib/backend/types'
import { formatDateRo, fromIsoDate } from '../../lib/dates'
import { formatMoney, formatQty } from '../../lib/format'
import { dateTime } from './util'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status status-${status}`}>{statusLabel(status)}</span>
}

/** Produsele, livrarea și drumul comenzii prin statusuri. */
export function OrderDetails({ order }: { order: OrderRecord }) {
  const { draft, quote } = order
  const reached = new Map(order.events.map((e) => [e.status, e]))
  const path = order.status === 'anulata' ? orderStatuses.filter((s) => reached.has(s.id)) : orderStatuses.slice(0, 5)
  const current = path.findIndex((s) => s.id === order.status)

  return (
    <div className="order-details">
      <div className="table-scroll">
        <table className="order-lines">
          <thead>
            <tr>
              <th>Produs</th>
              <th className="num">Cantitate</th>
              <th className="num">Sumă, {currency}</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => (
              <tr key={`${line.description}-${line.details}`}>
                <td>
                  {line.description}
                  <small>{line.details}</small>
                </td>
                <td className="num">
                  {formatQty(line.qty)} {line.unit}
                </td>
                <td className="num">{formatMoney(line.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {quote.discount > 0 && (
              <tr className="is-sub">
                <td colSpan={2}>Reducere volum {Math.round(quote.discountPct * 100)}%</td>
                <td className="num">−{formatMoney(quote.discount)}</td>
              </tr>
            )}
            {quote.deliveryFee > 0 && (
              <tr className="is-sub">
                <td colSpan={2}>Livrare</td>
                <td className="num">{formatMoney(quote.deliveryFee)}</td>
              </tr>
            )}
            <tr className="is-sub">
              {/* cota din momentul comenzii, calculată din sume (comenzile vechi pot avea altă cotă) */}
              <td colSpan={2}>TVA {quote.netTotal > 0 ? Math.round((quote.vat / quote.netTotal) * 100) : 0}%</td>
              <td className="num">{formatMoney(quote.vat)}</td>
            </tr>
            <tr>
              <td colSpan={2}>Total cu TVA</td>
              <td className="num">{formatMoney(quote.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <dl className="order-facts">
        <div>
          <dt>{draft.deliveryMethod === 'delivery' ? 'Livrare' : 'Ridicare de la sediu'}</dt>
          <dd>{draft.date ? formatDateRo(fromIsoDate(draft.date)) : '—'}</dd>
        </div>
        {draft.deliveryMethod === 'delivery' && (
          <div>
            <dt>Adresa</dt>
            <dd>{draft.deliveryAddress}</dd>
          </div>
        )}
        {draft.client.notes && (
          <div>
            <dt>Mențiuni</dt>
            <dd>{draft.client.notes}</dd>
          </div>
        )}
      </dl>

      <ol className="order-track" aria-label="Statusul comenzii">
        {path.map((s, i) => {
          const event = reached.get(s.id)
          const state = i < current ? 'is-done' : i === current ? 'is-current' : ''
          return (
            <li key={s.id} className={`${state} track-${s.id}`}>
              <strong>{s.label}</strong>
              <span>{event ? dateTime(event.at) : s.hint}</span>
              {event?.note && <em>{event.note}</em>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Field({ label, error, className = '', type = 'text', ...input }: FieldProps) {
  const errorId = useId()
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <input type={type} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} {...input} />
      {error && (
        <small id={errorId} className="field-error">
          {error}
        </small>
      )}
    </label>
  )
}

/** Mesaj de reușită sau de eroare după o acțiune. */
export function Notice({ kind, children }: { kind: 'ok' | 'error'; children: string }) {
  return (
    <p className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}

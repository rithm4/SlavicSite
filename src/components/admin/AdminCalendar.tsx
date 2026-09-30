import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { ro } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Lock, LockOpen, Phone, Printer } from 'lucide-react'
import { useState } from 'react'
import { currency } from '../../config/company'
import { useAccount } from '../../lib/account'
import { fromIsoDate, toIsoDate } from '../../lib/dates'
import { formatMoney, formatPallets } from '../../lib/format'
import { useHashParam } from '../../lib/useRoute'
import { Notice, StatusBadge } from '../account/shared'
import { errorText } from '../account/util'
import type { AdminData } from './AdminPanel'
import { capacity, dayKind, dayLabel, isActive, ordersOn, todayIso } from './helpers'
import { KindTag, OrderQuickActions } from './OrderActions'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']

export function AdminCalendar({ data }: { data: AdminData }) {
  const { orders, closedDays } = data
  const asked = useHashParam('zi')
  const [selected, setSelected] = useState(() => asked ?? todayIso())
  const [month, setMonth] = useState(() => startOfMonth(fromIsoDate(asked ?? todayIso())))
  const today = todayIso()

  // un link către altă zi (ex. „Azi” / „Mâine” din prezentare) mută și luna
  const [lastAsked, setLastAsked] = useState(asked)
  if (asked !== lastAsked) {
    setLastAsked(asked)
    if (asked) {
      setSelected(asked)
      setMonth(startOfMonth(fromIsoDate(asked)))
    }
  }

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const monthLabel = format(month, 'LLLL yyyy', { locale: ro })

  const pick = (iso: string) => {
    setSelected(iso)
    history.replaceState(null, '', `#/admin?sectiune=calendar&zi=${iso}`)
  }
  const goToday = () => {
    setMonth(startOfMonth(new Date()))
    pick(today)
  }

  return (
    <section className="admin-section">
      <div className="calendar-layout">
        <div className="month">
          <div className="month-head">
            <h3>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h3>
            <div className="month-nav">
              <button type="button" className="btn-link" onClick={goToday}>
                Azi
              </button>
              <button type="button" className="icon-btn" aria-label="Luna trecută" onClick={() => setMonth(addMonths(month, -1))}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" aria-label="Luna următoare" onClick={() => setMonth(addMonths(month, 1))}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="month-grid" role="grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className="month-weekday" role="columnheader">
                {w}
              </span>
            ))}
            {days.map((d) => {
              const iso = toIsoDate(d)
              const list = ordersOn(orders, iso).filter(isActive)
              const kind = dayKind(iso, closedDays)
              const delivery = list.filter((o) => o.draft.deliveryMethod === 'delivery').length
              const classes = [
                'month-day',
                d.getMonth() !== month.getMonth() && 'is-other',
                iso === today && 'is-today',
                iso === selected && 'is-selected',
                kind !== 'work' && `is-${kind}`,
                list.length >= capacity && 'is-full',
                iso < today && 'is-past',
              ]
              return (
                <button
                  key={iso}
                  type="button"
                  className={classes.filter(Boolean).join(' ')}
                  aria-pressed={iso === selected}
                  aria-label={`${dayLabel(iso)}: ${list.length} comenzi`}
                  onClick={() => pick(iso)}
                >
                  <span className="month-num">{d.getDate()}</span>
                  {kind === 'closed' && <span className="month-tag">Închis</span>}
                  {kind === 'holiday' && <span className="month-tag">Sărbătoare</span>}
                  {list.length > 0 && (
                    <span className="month-counts">
                      {delivery > 0 && <span>{delivery} livr.</span>}
                      {list.length - delivery > 0 && <span>{list.length - delivery} ridic.</span>}
                    </span>
                  )}
                  {kind === 'work' && (
                    <span className="month-load" aria-hidden="true">
                      {Array.from({ length: capacity }, (_, i) => (
                        <i key={i} className={i < list.length ? 'is-on' : ''} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="month-legend muted">
            Punctele arată cât din capacitatea zilei ({capacity} comenzi) e ocupată. O zi plină nu mai poate fi aleasă
            de clienți.
          </p>
        </div>

        <DaySheet key={selected} day={selected} data={data} />
      </div>
    </section>
  )
}

/** Foaia zilei: ce se livrează și ce se ridică, cu acțiuni; se poate tipări. */
function DaySheet({ day, data }: { day: string; data: AdminData }) {
  const { backend } = useAccount()
  const { orders, closedDays, reload } = data
  const list = ordersOn(orders, day)
  const active = list.filter(isActive)
  const kind = dayKind(day, closedDays)
  const closed = closedDays.find((c) => c.day === day)
  const [reason, setReason] = useState('')
  const [closing, setClosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pallets = active.reduce((s, o) => s + o.quote.totalPallets, 0)

  const setClosed = async (value: boolean) => {
    if (!backend) return
    setBusy(true)
    setError(null)
    try {
      await backend.admin.setDayClosed(day, value, reason.trim())
      setClosing(false)
      setReason('')
      reload()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const print = () => {
    document.body.classList.add('print-day')
    window.addEventListener('afterprint', () => document.body.classList.remove('print-day'), { once: true })
    window.print()
  }

  return (
    <aside className="day-sheet">
      <header className="day-head">
        <div>
          <h3>{dayLabel(day, true)}</h3>
          <p className="muted">
            {kind === 'weekend' && 'Zi liberă (weekend). '}
            {kind === 'holiday' && 'Sărbătoare legală. '}
            {closed && `Închisă pentru comenzi noi${closed.reason ? `: ${closed.reason}` : ''}. `}
            {kind === 'work' && `${active.length} din ${capacity} locuri ocupate. `}
            {active.length > 0 && `≈ ${formatPallets(pallets)} de pregătit.`}
          </p>
        </div>
        <button type="button" className="btn secondary btn-icon no-print" disabled={list.length === 0} onClick={print}>
          <Printer size={16} aria-hidden="true" />
          Tipărește
        </button>
      </header>

      {list.length === 0 ? (
        <p className="muted">Nicio comandă în această zi.</p>
      ) : (
        <ul className="day-orders">
          {list.map((o) => (
            <li key={o.id} className={isActive(o) ? '' : 'is-cancelled'}>
              <div className="day-order-top">
                <KindTag order={o} />
                <StatusBadge status={o.status} />
              </div>
              <a className="day-order-name" href={`#/admin?sectiune=comenzi&comanda=${o.id}`}>
                <strong>{o.draft.client.name}</strong> <span className="muted">· {o.number}</span>
              </a>
              <p className="day-order-where">
                {o.draft.deliveryMethod === 'delivery' ? o.draft.deliveryAddress : 'Ridicare de la sediu'}
              </p>
              <p className="muted day-order-meta">
                {o.quote.lines.map((l) => `${l.description} × ${l.qty}`).join(', ')} · ≈ {formatPallets(o.quote.totalPallets)} ·{' '}
                {formatMoney(o.quote.total)} {currency}
              </p>
              <p className="day-order-contact">
                <Phone size={14} aria-hidden="true" />
                <a href={`tel:${o.draft.client.phone.replace(/\s/g, '')}`}>{o.draft.client.phone}</a>
                {o.draft.client.contactPerson && <span className="muted"> · {o.draft.client.contactPerson}</span>}
              </p>
              <div className="no-print">
                <OrderQuickActions order={o} onChanged={reload} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {kind !== 'weekend' && kind !== 'holiday' && (
        <div className="day-close no-print">
          {closed ? (
            <button type="button" className="btn-link btn-icon" disabled={busy} onClick={() => void setClosed(false)}>
              <LockOpen size={16} aria-hidden="true" />
              Redeschide ziua pentru comenzi noi
            </button>
          ) : closing ? (
            <div className="quick-form">
              <label className="field">
                <span>Motivul (ex. revizie, inventar)</span>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="quick-buttons">
                <button type="button" className="btn" disabled={busy} onClick={() => void setClosed(true)}>
                  Închide ziua
                </button>
                <button type="button" className="btn-link" onClick={() => setClosing(false)}>
                  Renunță
                </button>
              </div>
              {active.length > 0 && (
                <p className="muted">Comenzile deja programate rămân; doar clienții noi nu mai pot alege ziua.</p>
              )}
            </div>
          ) : (
            <button type="button" className="btn-link btn-icon" onClick={() => setClosing(true)}>
              <Lock size={16} aria-hidden="true" />
              Închide ziua pentru comenzi noi
            </button>
          )}
          {error && <Notice kind="error">{error}</Notice>}
        </div>
      )}
    </aside>
  )
}

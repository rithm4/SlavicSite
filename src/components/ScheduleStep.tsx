import { DayPicker } from 'react-day-picker'
import { ro } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { calendarRules, holidays } from '../config/calendar'
import { deliveryRules } from '../config/catalog'
import { currency } from '../config/company'
import { formatDateRo, fromIsoDate, isFullyBooked, toIsoDate } from '../lib/dates'
import { formatMoney } from '../lib/format'
import type { StepProps } from './stepProps'

interface ScheduleStepProps extends StepProps {
  earliest: Date
  latest: Date
  leadDays: number
  booked: Record<string, number>
}

export function ScheduleStep({ draft, update, showErrors, earliest, latest, leadDays, booked }: ScheduleStepProps) {
  const selected = draft.date ? fromIsoDate(draft.date) : undefined

  return (
    <div className="step">
      <header className="step-head">
        <h2>Când și cum primiți comanda?</h2>
        <p className="hint">Alegeți modul de primire și data din calendar.</p>
      </header>

      <div className="segmented" role="radiogroup" aria-label="Mod de primire">
        {(
          [
            ['pickup', 'Ridicare de la sediu', 'gratuit'],
            ['delivery', 'Livrare la adresă', `${formatMoney(deliveryRules.fee)} ${currency}, gratuit peste ${formatMoney(deliveryRules.freeFrom)} ${currency}`],
          ] as const
        ).map(([value, label, note]) => (
          <label key={value} className={draft.deliveryMethod === value ? 'is-active' : ''}>
            <input
              type="radio"
              name="deliveryMethod"
              value={value}
              checked={draft.deliveryMethod === value}
              onChange={() => update({ deliveryMethod: value })}
            />
            <strong>{label}</strong>
            <small className="muted">{note}</small>
          </label>
        ))}
      </div>

      {draft.deliveryMethod === 'delivery' && (
        <label className="field">
          <span>Adresa de livrare</span>
          <input
            type="text"
            placeholder="Localitate, stradă, număr"
            value={draft.deliveryAddress}
            aria-invalid={showErrors && !draft.deliveryAddress.trim()}
            onChange={(e) => update({ deliveryAddress: e.target.value })}
          />
          {showErrors && !draft.deliveryAddress.trim() && <small className="field-error">Introduceți adresa.</small>}
        </label>
      )}

      <h3 className="section-title">Data {draft.deliveryMethod === 'delivery' ? 'livrării' : 'ridicării'}</h3>
      <div className="calendar-wrap">
        <DayPicker
          mode="single"
          locale={ro}
          weekStartsOn={1}
          selected={selected}
          onSelect={(d) => update({ date: d ? toIsoDate(d) : null })}
          defaultMonth={selected ?? earliest}
          startMonth={earliest}
          endMonth={latest}
          disabled={[
            { before: earliest },
            { after: latest },
            { dayOfWeek: [0, 6] },
            holidays.map(fromIsoDate),
            (d) => isFullyBooked(d, booked),
          ]}
          modifiers={{ booked: (d) => isFullyBooked(d, booked) }}
          modifiersClassNames={{ booked: 'day-booked' }}
        />
        <div className="calendar-side">
          <div className={`date-box${selected ? ' is-set' : ''}`}>
            <span className="muted">Data aleasă</span>
            <strong>{selected ? formatDateRo(selected) : '—'}</strong>
          </div>
          {showErrors && !selected && <p className="field-error">Alegeți o dată din calendar.</p>}
          <p className="info">
            Termen de execuție: <strong>{leadDays} zile lucrătoare</strong>
            {draft.custom.length > 0 && ', include elementele personalizate'}.
            <br />
            Prima dată disponibilă: <strong>{formatDateRo(earliest)}</strong>.
          </p>
          <ul className="legend">
            <li>
              <span className="dot disabled" /> Indisponibil: weekend, sărbătoare sau prea devreme
            </li>
            <li>
              <span className="dot booked" /> Zi complet ocupată ({calendarRules.maxOrdersPerDay} comenzi)
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ro } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { calendarRules, holidays } from '../config/calendar'
import type { DeliveryAddress } from '../lib/backend/types'
import { deliveryRules } from '../config/catalog'
import { currency } from '../config/company'
import { formatDateRo, fromIsoDate, isFullyBooked, toIsoDate } from '../lib/dates'
import { formatMoney, formatPallets } from '../lib/format'
import type { StepProps } from './stepProps'

interface ScheduleStepProps extends StepProps {
  earliest: Date
  latest: Date
  leadDays: number
  booked: Record<string, number>
  /** Zilele ocupate nu s-au putut verifica (fără legătură cu serverul). */
  bookedUnknown?: boolean
  /** Adresele din contul firmei, dacă e cineva autentificat. */
  savedAddresses?: DeliveryAddress[]
}

export function ScheduleStep({
  draft,
  update,
  quote,
  showErrors,
  earliest,
  latest,
  leadDays,
  booked,
  bookedUnknown = false,
  savedAddresses = [],
}: ScheduleStepProps) {
  const selected = draft.date ? fromIsoDate(draft.date) : undefined

  // adresele din cont se aleg ca opțiuni; „Altă adresă” deschide câmpul de scris
  const isSaved = (address: string) => savedAddresses.some((a) => a.address === address)
  const [other, setOther] = useState(() => !!draft.deliveryAddress.trim() && !isSaved(draft.deliveryAddress))
  const typing = savedAddresses.length === 0 || other || (!!draft.deliveryAddress.trim() && !isSaved(draft.deliveryAddress))

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
            [
              'delivery',
              'Livrare la adresă',
              deliveryRules.fee === null
                ? 'costul se stabilește separat'
                : `${formatMoney(deliveryRules.fee)} ${currency}, gratuit peste ${formatMoney(deliveryRules.freeFrom)} ${currency}`,
            ],
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

      {draft.deliveryMethod === 'delivery' && savedAddresses.length > 0 && (
        <>
          <h3 className="section-title">Unde livrăm?</h3>
          <div className="segmented saved-addresses" role="radiogroup" aria-label="Adresa de livrare">
            {savedAddresses.map((a) => {
              const active = !typing && draft.deliveryAddress === a.address
              return (
                <label key={a.id} className={active ? 'is-active' : ''}>
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={active}
                    onChange={() => {
                      setOther(false)
                      update({ deliveryAddress: a.address })
                    }}
                  />
                  <strong>{a.label || 'Adresă salvată'}</strong>
                  <small className="muted">{a.address}</small>
                </label>
              )
            })}
            <label className={typing ? 'is-active' : ''}>
              <input
                type="radio"
                name="savedAddress"
                checked={typing}
                onChange={() => {
                  setOther(true)
                  if (isSaved(draft.deliveryAddress)) update({ deliveryAddress: '' })
                }}
              />
              <strong>Altă adresă</strong>
              <small className="muted">o scrieți mai jos</small>
            </label>
          </div>
        </>
      )}

      {draft.deliveryMethod === 'delivery' && typing && (
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
          {bookedUnknown && (
            <p className="info info-warn" role="status">
              Nu am putut verifica acum zilele ocupate. Alegeți data dorită: v-o confirmăm la telefon.
            </p>
          )}
          <p className="info">
            Termen de execuție: <strong>{leadDays} zile lucrătoare</strong>
            {draft.custom.length > 0 && ', include elementele personalizate'}.
            <br />
            Prima dată disponibilă: <strong>{formatDateRo(earliest)}</strong>.
            <br />
            Volum de transport: <strong>≈ {formatPallets(quote.totalPallets)}</strong>.
          </p>
          <ul className="legend">
            <li>
              <span className="dot disabled" /> Indisponibil: weekend, sărbătoare sau prea devreme
            </li>
            <li>
              <span className="dot booked" /> Zi ocupată ({calendarRules.maxOrdersPerDay} comenzi) sau închisă
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

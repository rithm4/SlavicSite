import { currency } from '../config/company'
import { formatDateRo, fromIsoDate } from '../lib/dates'
import { approxPallets, formatMoney, formatPallets, formatQty } from '../lib/format'
import { QuoteTotals } from './QuoteSummary'
import type { StepProps } from './stepProps'

export function ReviewStep({ draft, quote }: StepProps) {
  const c = draft.client
  return (
    <div className="step">
      <header className="step-head">
        <h2>Verificați comanda</h2>
        <p className="hint">Dacă totul e corect, generați contul de plată. PDF-ul se descarcă automat.</p>
      </header>

      <table className="review-table">
        <thead>
          <tr>
            <th>Denumire</th>
            <th className="num">Cantitate</th>
            <th className="num">Paleți</th>
            <th className="num">Preț ({currency})</th>
            <th className="num">Suma ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((l, i) => (
            <tr key={i}>
              <td className="name">
                {l.description}
                <small className="muted">{l.details}</small>
              </td>
              <td className="num" data-label="Cantitate">
                {formatQty(l.qty)} {l.unit}
              </td>
              <td className="num" data-label="Paleți">
                {approxPallets(l.pallets)}
              </td>
              <td className="num" data-label={`Preț, ${currency}`}>
                {formatMoney(l.unitPrice)}
              </td>
              <td className="num strong" data-label={`Suma, ${currency}`}>
                {formatMoney(l.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <QuoteTotals quote={quote} />

      <div className="review-info">
        <div>
          <h4>{draft.deliveryMethod === 'delivery' ? 'Livrare' : 'Ridicare de la sediu'}</h4>
          <p>
            {draft.date && formatDateRo(fromIsoDate(draft.date))} · ≈ {formatPallets(quote.totalPallets)}
            {draft.deliveryMethod === 'delivery' && (
              <>
                <br />
                {draft.deliveryAddress}
              </>
            )}
          </p>
        </div>
        <div>
          <h4>Cumpărător</h4>
          <p>
            {c.name}, IDNO {c.idno}
            <br />
            {c.contactPerson && <>{c.contactPerson} · </>}
            {c.phone} · {c.email}
          </p>
        </div>
      </div>
    </div>
  )
}

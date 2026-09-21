import { currency } from '../config/company'
import { formatDateRo, fromIsoDate } from '../lib/dates'
import { formatMoney, formatQty } from '../lib/format'
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

      <div className="table-scroll">
        <table className="review-table">
          <thead>
            <tr>
              <th>Denumire</th>
              <th className="num">Cant.</th>
              <th className="num">Preț ({currency})</th>
              <th className="num">Suma ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((l, i) => (
              <tr key={i}>
                <td>
                  {l.description}
                  <small className="muted">{l.details}</small>
                </td>
                <td className="num">
                  {formatQty(l.qty)} {l.unit}
                </td>
                <td className="num">{formatMoney(l.unitPrice)}</td>
                <td className="num">{formatMoney(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <QuoteTotals quote={quote} />

      <div className="review-info">
        <div>
          <h4>{draft.deliveryMethod === 'delivery' ? 'Livrare' : 'Ridicare de la sediu'}</h4>
          <p>
            {draft.date && formatDateRo(fromIsoDate(draft.date))}
            {draft.deliveryMethod === 'delivery' && <><br />{draft.deliveryAddress}</>}
          </p>
        </div>
        <div>
          <h4>Cumpărător</h4>
          <p>
            {c.name}
            {c.type === 'pj' && <><br />IDNO {c.idno}</>}
            <br />
            {c.phone} · {c.email}
          </p>
        </div>
      </div>
    </div>
  )
}

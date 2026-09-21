import { currency, vatRate } from '../config/company'
import { formatMoney } from '../lib/format'
import type { Quote } from '../lib/types'

export function QuoteTotals({ quote }: { quote: Quote }) {
  return (
    <dl className="totals">
      <div>
        <dt>Total produse</dt>
        <dd>{formatMoney(quote.productsSubtotal)}</dd>
      </div>
      {quote.discount > 0 && (
        <div className="discount">
          <dt>Reducere volum {Math.round(quote.discountPct * 100)}%</dt>
          <dd>−{formatMoney(quote.discount)}</dd>
        </div>
      )}
      {quote.deliveryFee > 0 && (
        <div>
          <dt>Livrare</dt>
          <dd>{formatMoney(quote.deliveryFee)}</dd>
        </div>
      )}
      <div>
        <dt>TVA {Math.round(vatRate * 100)}%</dt>
        <dd>{formatMoney(quote.vat)}</dd>
      </div>
      <div className="grand">
        <dt>Total de plată</dt>
        <dd>
          {formatMoney(quote.total)} {currency}
        </dd>
      </div>
    </dl>
  )
}

export function QuoteSummary({ quote }: { quote: Quote }) {
  return (
    <aside className="summary" aria-label="Rezumat comandă">
      <h3>Comanda dvs.</h3>
      {quote.lines.length === 0 ? (
        <p className="muted">Nu ați ales încă niciun element.</p>
      ) : (
        <ul className="summary-lines">
          {quote.lines.map((l, i) => (
            <li key={i}>
              <span>
                {l.description}
                <small className="muted">
                  {l.qty} {l.unit} · {l.details}
                </small>
              </span>
              <span>{formatMoney(l.total)}</span>
            </li>
          ))}
        </ul>
      )}
      <QuoteTotals quote={quote} />
    </aside>
  )
}

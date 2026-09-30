import { ArrowRight, RotateCcw } from 'lucide-react'
import { currency } from '../../config/company'
import { useAccount } from '../../lib/account'
import { repeatOrder } from '../../lib/draft'
import { formatMoney } from '../../lib/format'
import { href } from '../../lib/useRoute'
import type { CabinetData } from './Cabinet'
import { StatusBadge } from './shared'
import { dateOf } from './util'

const ACTIVE = new Set(['noua', 'achitata', 'productie', 'gata'])

export function Overview({ data }: { data: CabinetData }) {
  const { profile } = useAccount()
  const { orders, documents, loading } = data
  const year = new Date().getFullYear()
  const active = orders.filter((o) => ACTIVE.has(o.status))
  const spent = orders
    .filter((o) => o.status !== 'anulata' && new Date(o.issuedAt).getFullYear() === year)
    .reduce((sum, o) => sum + o.quote.total, 0)
  const last = orders[0]
  const incomplete = profile && (!profile.cui || !profile.phone)

  return (
    <section className="cab-section">
      <header className="cab-head">
        <h2>Bună ziua{profile?.contactPerson ? `, ${profile.contactPerson}` : ''}</h2>
        <div className="cab-head-actions">
          {last && (
            <button type="button" className="btn secondary btn-icon" onClick={() => repeatOrder(last.draft)}>
              <RotateCcw size={16} aria-hidden="true" />
              Repetă ultima comandă
            </button>
          )}
          <a className="btn btn-icon" href={href('comanda')}>
            Comandă nouă
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </header>

      {incomplete && (
        <a className="cab-callout" href="#/cont?sectiune=firma">
          Completați CUI-ul și telefonul firmei, ca să apară pe facturile proforme.
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      )}

      <div className="cab-stats">
        <div className="cab-stat">
          <span>Comenzi în lucru</span>
          <strong>{loading ? '…' : active.length}</strong>
        </div>
        <div className="cab-stat">
          <span>Comandat în {year}</span>
          <strong>
            {loading ? '…' : formatMoney(spent)} <small>{currency}</small>
          </strong>
        </div>
        <div className="cab-stat">
          <span>Ultima comandă</span>
          {last ? (
            <>
              <strong className="cab-stat-mid">{last.number}</strong>
              <StatusBadge status={last.status} />
            </>
          ) : (
            <strong>{loading ? '…' : '—'}</strong>
          )}
        </div>
        <div className="cab-stat">
          <span>Documente</span>
          <strong>{loading ? '…' : documents.length + orders.length}</strong>
        </div>
      </div>

      <div className="cab-block">
        <div className="cab-block-head">
          <h3>Comenzile recente</h3>
          {orders.length > 3 && (
            <a className="btn-link" href="#/cont?sectiune=comenzi">
              Toate comenzile
            </a>
          )}
        </div>
        {orders.length === 0 ? (
          <p className="muted">{loading ? 'Se încarcă…' : 'Încă nu aveți comenzi făcute din acest cont.'}</p>
        ) : (
          <ul className="order-rows">
            {orders.slice(0, 3).map((o) => (
              <li key={o.id}>
                <a href={`#/cont?sectiune=comenzi&comanda=${o.id}`}>
                  <strong>{o.number}</strong>
                  <span className="muted">{dateOf(o.issuedAt)}</span>
                  <StatusBadge status={o.status} />
                  <span className="order-rows-total">
                    {formatMoney(o.quote.total)} {currency}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

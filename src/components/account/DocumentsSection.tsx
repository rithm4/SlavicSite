import { Download } from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../lib/account'
import { downloadInvoice } from '../../lib/download'
import type { CabinetData } from './Cabinet'
import { Notice } from './shared'
import { dateOf, errorText, kindLabel, openDocument } from './util'

export function DocumentsSection({ data }: { data: CabinetData }) {
  const { backend } = useAccount()
  const { orders, documents, loading } = data
  const [error, setError] = useState<string | null>(null)

  const run = (action: () => Promise<void>) => {
    setError(null)
    action().catch((e: unknown) => setError(errorText(e)))
  }

  return (
    <section className="cab-section">
      <header className="cab-head">
        <div>
          <h2>Documente</h2>
          <p className="muted">Facturile și certificatele le adăugăm noi, după plată și livrare.</p>
        </div>
      </header>
      {error && <Notice kind="error">{error}</Notice>}

      <div className="cab-block">
        <h3>Facturi și certificate</h3>
        {documents.length === 0 ? (
          <p className="muted">{loading ? 'Se încarcă…' : 'Deocamdată nu sunt documente.'}</p>
        ) : (
          <ul className="doc-list">
            {documents.map((d) => (
              <li key={d.id}>
                <span className="doc-kind">{kindLabel(d.kind)}</span>
                <span className="doc-name">
                  <strong>{d.title}</strong>
                  <span className="muted">
                    {d.orderNumber ? `Comanda ${d.orderNumber} · ` : ''}
                    {dateOf(d.createdAt)}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn secondary btn-icon"
                  onClick={() => backend && run(() => openDocument(backend, d))}
                >
                  <Download size={16} aria-hidden="true" />
                  Descarcă
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cab-block">
        <h3>Facturi proforme</h3>
        {orders.length === 0 ? (
          <p className="muted">{loading ? 'Se încarcă…' : 'Apar aici după prima comandă.'}</p>
        ) : (
          <ul className="doc-list">
            {orders.map((o) => (
              <li key={o.id}>
                <span className="doc-kind">Factură proformă</span>
                <span className="doc-name">
                  <strong>Nr. {o.number}</strong>
                  <span className="muted">{dateOf(o.issuedAt)}</span>
                </span>
                <button type="button" className="btn secondary btn-icon" onClick={() => run(() => downloadInvoice(o))}>
                  <Download size={16} aria-hidden="true" />
                  Descarcă
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

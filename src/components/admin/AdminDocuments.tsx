import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAccount } from '../../lib/account'
import { documentKinds } from '../../lib/backend/types'
import type { DocumentKind } from '../../lib/backend/types'
import { Notice } from '../account/shared'
import { dateOf, errorText, kindLabel, openDocument } from '../account/util'
import type { AdminData } from './AdminPanel'

/** Încărcarea facturilor și certificatelor în contul unui client. */
export function AdminDocuments({ data }: { data: AdminData }) {
  const { backend } = useAccount()
  const { clients, orders, documents, loading, reload } = data
  const [userId, setUserId] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [kind, setKind] = useState<DocumentKind>('factura')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const clientOrders = orders.filter((o) => o.userId === userId)
  const clientName = (id: string) => clients.find((c) => c.userId === id)?.profile.name ?? '—'

  const run = async (action: () => Promise<void>, ok: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      setMessage({ kind: 'ok', text: ok })
      reload()
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!backend) return
    if (!userId || !file || !title.trim()) {
      setMessage({ kind: 'error', text: 'Alegeți clientul, scrieți titlul și atașați fișierul.' })
      return
    }
    void run(async () => {
      await backend.admin.uploadDocument({ userId, orderNumber: orderNumber || null, kind, title: title.trim(), file })
      setTitle('')
      setFile(null)
      ;(e.target as HTMLFormElement).reset()
    }, 'Documentul a fost adăugat în contul clientului.')
  }

  return (
    <section className="admin-section">
      <form className="cab-form" onSubmit={submit} noValidate>
        <h3>Adaugă un document în contul unui client</h3>
        <div className="grid">
          <label className="field">
            <span>Client *</span>
            <select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                setOrderNumber('')
              }}
            >
              <option value="">Alegeți firma</option>
              {clients.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.profile.name || c.profile.email}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Comanda</span>
            <select value={orderNumber} disabled={!userId} onChange={(e) => setOrderNumber(e.target.value)}>
              <option value="">Fără legătură cu o comandă</option>
              {clientOrders.map((o) => (
                <option key={o.id} value={o.number}>
                  {o.number} din {dateOf(o.issuedAt)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tip</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
              {documentKinds.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Titlu *</span>
            <input
              type="text"
              value={title}
              placeholder="ex. Factura nr. 118"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field span-2">
            <span>Fișier * (PDF sau imagine)</span>
            <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
        <div className="cab-form-actions">
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Se încarcă…' : 'Adaugă documentul'}
          </button>
        </div>
      </form>

      <div className="cab-block">
        <h3>Documente încărcate</h3>
        {documents.length === 0 ? (
          <p className="muted">{loading ? 'Se încarcă…' : 'Încă nu ați încărcat documente.'}</p>
        ) : (
          <ul className="doc-list">
            {documents.map((d) => (
              <li key={d.id}>
                <span className="doc-kind">{kindLabel(d.kind)}</span>
                <span className="doc-name">
                  <strong>{d.title}</strong>
                  <span className="muted">
                    {clientName(d.userId)}
                    {d.orderNumber ? ` · ${d.orderNumber}` : ''} · {dateOf(d.createdAt)}
                  </span>
                </span>
                <span className="doc-actions">
                  <button
                    type="button"
                    className="btn secondary btn-icon"
                    onClick={() => backend && void openDocument(backend, d).catch(() => undefined)}
                  >
                    <Download size={16} aria-hidden="true" />
                    Deschide
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Șterge ${d.title}`}
                    disabled={busy}
                    onClick={() => backend && void run(() => backend.admin.deleteDocument(d), 'Documentul a fost șters.')}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

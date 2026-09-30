import { Check, Mail, Phone, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../lib/account'
import type { ContactMessage } from '../../lib/backend/types'
import { Notice } from '../account/shared'
import { dateTime, errorText } from '../account/util'
import type { AdminData } from './AdminPanel'

type Filter = 'noi' | 'toate'

const isEmail = (contact: string) => contact.includes('@')

/** Mesajele din pagina de contacte: cine a scris, cum îl găsim, ce vrea; se bifează când e rezolvat. */
export function AdminMessages({ data }: { data: AdminData }) {
  const { messages, loading } = data
  const unread = messages.filter((m) => !m.handled).length
  const [filter, setFilter] = useState<Filter>(unread > 0 ? 'noi' : 'toate')
  const shown = filter === 'noi' ? messages.filter((m) => !m.handled) : messages

  if (messages.length === 0) {
    return (
      <p className="muted">
        {loading ? 'Se încarcă…' : 'Încă nu a scris nimeni din pagina de contacte. Mesajele noi apar aici.'}
      </p>
    )
  }

  return (
    <section className="admin-section">
      <div className="chips" role="group" aria-label="Ce mesaje arată">
        <button type="button" aria-pressed={filter === 'noi'} onClick={() => setFilter('noi')}>
          De rezolvat <span>{unread}</span>
        </button>
        <button type="button" aria-pressed={filter === 'toate'} onClick={() => setFilter('toate')}>
          Toate <span>{messages.length}</span>
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="muted">Toate mesajele sunt rezolvate.</p>
      ) : (
        <ul className="message-list">
          {shown.map((m) => (
            <MessageCard key={m.id} message={m} onChanged={data.reload} />
          ))}
        </ul>
      )}
    </section>
  )
}

function MessageCard({ message: m, onChanged }: { message: ContactMessage; onChanged: () => void }) {
  const { backend } = useAccount()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const email = isEmail(m.contact)

  const toggle = async () => {
    if (!backend) return
    setBusy(true)
    setError(null)
    try {
      await backend.admin.setMessageHandled(m.id, !m.handled)
      onChanged()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className={m.handled ? 'message-card is-handled' : 'message-card'}>
      <div className="message-head">
        <div>
          <strong>{m.name}</strong>
          {m.company && <span className="muted"> · {m.company}</span>}
        </div>
        <span className="muted message-date">{dateTime(m.createdAt)}</span>
      </div>
      <p className="message-text">{m.text}</p>
      <div className="message-actions">
        <a
          className="btn secondary btn-icon"
          href={email ? `mailto:${m.contact}?subject=${encodeURIComponent('Răspuns la mesajul de pe site')}` : `tel:${m.contact.replace(/[^\d+]/g, '')}`}
        >
          {email ? <Mail size={16} aria-hidden="true" /> : <Phone size={16} aria-hidden="true" />}
          {m.contact}
        </a>
        <button type="button" className="btn-link btn-icon" disabled={busy} onClick={() => void toggle()}>
          {m.handled ? <RotateCcw size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          {m.handled ? 'Redeschide' : 'Marchează rezolvat'}
        </button>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
    </li>
  )
}

import { CalendarClock, Truck, Warehouse, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../lib/account'
import type { OrderRecord } from '../../lib/backend/types'
import { Notice } from '../account/shared'
import { errorText } from '../account/util'
import { todayIso } from './helpers'

/** Livrare la adresă sau ridicare de la sediu. */
export function KindTag({ order }: { order: OrderRecord }) {
  return order.draft.deliveryMethod === 'delivery' ? (
    <span className="kind kind-delivery">
      <Truck size={14} aria-hidden="true" />
      Livrare
    </span>
  ) : (
    <span className="kind kind-pickup">
      <Warehouse size={14} aria-hidden="true" />
      Ridicare
    </span>
  )
}

type Open = 'reschedule' | 'cancel' | null

/** Mutarea datei și anularea, cu confirmare, direct din listă. */
export function OrderQuickActions({ order, onChanged }: { order: OrderRecord; onChanged(): void }) {
  const { backend } = useAccount()
  const [open, setOpen] = useState<Open>(null)
  const [day, setDay] = useState(order.draft.date ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  if (order.status === 'anulata' || order.status === 'livrata') return null

  const toggle = (next: Open) => {
    setOpen(open === next ? null : next)
    setNote('')
    setMessage(null)
  }

  const run = async (action: () => Promise<void>, ok: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      setOpen(null)
      setMessage({ kind: 'ok', text: ok })
      onChanged()
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="quick-actions">
      <div className="quick-buttons">
        <button type="button" className="btn secondary btn-icon" aria-expanded={open === 'reschedule'} onClick={() => toggle('reschedule')}>
          <CalendarClock size={16} aria-hidden="true" />
          Mută data
        </button>
        <button type="button" className="btn secondary btn-icon danger-btn" aria-expanded={open === 'cancel'} onClick={() => toggle('cancel')}>
          <XCircle size={16} aria-hidden="true" />
          Anulează
        </button>
      </div>

      {open === 'reschedule' && (
        <div className="quick-form">
          <label className="field">
            <span>Data nouă</span>
            <input type="date" min={todayIso()} value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label className="field">
            <span>Mesaj pentru client (opțional)</span>
            <input type="text" placeholder="ex. Mutată la cererea dvs." value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn"
            disabled={busy || !day || day === order.draft.date}
            onClick={() => backend && void run(() => backend.admin.rescheduleOrder(order.id, day, note.trim()), 'Data a fost mutată.')}
          >
            Mută comanda
          </button>
        </div>
      )}

      {open === 'cancel' && (
        <div className="quick-form is-danger">
          <p>
            Anulați comanda <strong>{order.number}</strong> a firmei {order.draft.client.name}? Locul din calendar se
            eliberează, iar clientul vede anularea în cont.
          </p>
          <label className="field">
            <span>Motivul (îl vede clientul)</span>
            <input type="text" placeholder="ex. Neachitată în termen" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="quick-buttons">
            <button
              type="button"
              className="btn danger-solid"
              disabled={busy}
              onClick={() =>
                backend &&
                void run(
                  () => backend.admin.setOrderStatus(order.id, 'anulata', note.trim() || 'Comanda a fost anulată.'),
                  'Comanda a fost anulată.',
                )
              }
            >
              Da, anulează comanda
            </button>
            <button type="button" className="btn-link" onClick={() => setOpen(null)}>
              Renunță
            </button>
          </div>
        </div>
      )}

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </div>
  )
}

/** Nota internă a echipei pe comandă; clientul nu o vede. */
export function InternalNote({ order, value, onSaved }: { order: OrderRecord; value: string; onSaved(): void }) {
  const { backend } = useAccount()
  const [text, setText] = useState(value)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const changed = text.trim() !== value.trim()

  const save = async () => {
    if (!backend) return
    setState('saving')
    try {
      await backend.admin.saveNote(order.id, text.trim())
      setState('saved')
      onSaved()
    } catch {
      setState('error')
    }
  }

  return (
    <label className="field internal-note">
      <span>
        Notă internă <small>doar pentru echipă, clientul nu o vede</small>
      </span>
      <textarea
        rows={2}
        value={text}
        placeholder="ex. Sună înainte de livrare; rampa e în spate"
        onChange={(e) => {
          setText(e.target.value)
          setState('idle')
        }}
      />
      <span className="internal-note-foot">
        {changed && (
          <button type="button" className="btn-link" disabled={state === 'saving'} onClick={() => void save()}>
            {state === 'saving' ? 'Se salvează…' : 'Salvează nota'}
          </button>
        )}
        {state === 'saved' && !changed && <small className="muted">Nota a fost salvată.</small>}
        {state === 'error' && <small className="field-error">Nota nu s-a salvat. Încercați din nou.</small>}
      </span>
    </label>
  )
}

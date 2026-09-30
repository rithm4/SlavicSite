import { ArrowRight, Check, Send } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { getBackend } from '../../lib/backend'
import type { ContactMessageInput } from '../../lib/backend/types'
import { href } from '../../lib/useRoute'
import { Field, Notice } from '../account/shared'
import { errorText } from '../account/util'

const empty: ContactMessageInput = { name: '', company: '', contact: '', text: '' }

function errorsOf(m: ContactMessageInput): Partial<Record<keyof ContactMessageInput, string>> {
  const e: Partial<Record<keyof ContactMessageInput, string>> = {}
  if (!m.name.trim()) e.name = 'Scrieți numele.'
  const contact = m.contact.trim()
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  const isPhone = contact.replace(/[\s()+-]/g, '').length >= 8 && /^[\d\s()+-]+$/.test(contact)
  if (!isEmail && !isPhone) e.contact = 'Lăsați un telefon sau un e-mail la care să vă răspundem.'
  if (m.text.trim().length < 10) e.text = 'Scrieți pe scurt ce vă interesează.'
  return e
}

/** „Scrieți-ne”: întrebări și cereri de ofertă; mesajele ajung în panoul admin. */
export function ContactForm() {
  const [message, setMessage] = useState<ContactMessageInput>(empty)
  // câmp ascuns: îl completează doar roboții de spam
  const [trap, setTrap] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [demo, setDemo] = useState(false)

  const errors = showErrors ? errorsOf(message) : {}
  const set = (patch: Partial<ContactMessageInput>) => setMessage((m) => ({ ...m, ...patch }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setShowErrors(true)
    if (Object.keys(errorsOf(message)).length > 0) return
    setBusy(true)
    setError(null)
    try {
      const backend = await getBackend()
      if (!trap) {
        await backend.sendMessage({
          name: message.name.trim(),
          company: message.company.trim(),
          contact: message.contact.trim(),
          text: message.text.trim(),
        })
      }
      setDemo(backend.mode === 'demo')
      setSentTo(message.contact.trim())
      setMessage(empty)
      setShowErrors(false)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="contact-form is-sent" role="status">
        <span className="contact-sent-icon" aria-hidden="true">
          <Check size={22} />
        </span>
        <h2>Mulțumim, mesajul a ajuns la noi</h2>
        <p>
          Vă răspundem la <strong>{sentTo}</strong>.
          {demo && ' (Mod demonstrativ: mesajul apare în panoul admin, în acest browser.)'}
        </p>
        <button type="button" className="btn-link" onClick={() => setSentTo(null)}>
          Trimite alt mesaj
        </button>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <h2>Scrieți-ne</h2>
      <p className="muted">Întrebări, dimensiuni speciale, volume mari: vă răspundem cu o ofertă.</p>
      <div className="grid">
        <Field
          label="Nume *"
          autoComplete="name"
          value={message.name}
          error={errors.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <Field
          label="Firma"
          autoComplete="organization"
          value={message.company}
          onChange={(e) => set({ company: e.target.value })}
        />
        <Field
          label="Telefon sau e-mail *"
          className="span-2"
          value={message.contact}
          error={errors.contact}
          onChange={(e) => set({ contact: e.target.value })}
        />
        <label className="field span-2">
          <span>Mesaj *</span>
          <textarea
            rows={5}
            value={message.text}
            aria-invalid={!!errors.text}
            aria-describedby={errors.text ? 'contact-text-error' : undefined}
            onChange={(e) => set({ text: e.target.value })}
          />
          {errors.text && (
            <small id="contact-text-error" className="field-error">
              {errors.text}
            </small>
          )}
        </label>
        <label className="contact-trap" aria-hidden="true">
          Site web
          <input type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="contact-form-foot">
        <button type="submit" className="btn btn-lg btn-icon" disabled={busy}>
          <Send size={17} aria-hidden="true" />
          {busy ? 'Se trimite…' : 'Trimite mesajul'}
        </button>
        <a className="btn-link btn-icon" href={href('comanda')}>
          Sau calculați direct prețul
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </form>
  )
}

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAccount } from '../../lib/account'
import { emptyProfile } from '../../lib/backend/types'
import type { CompanyProfile } from '../../lib/backend/types'
import { profileErrors } from '../../lib/validation'
import { Field, Notice } from './shared'
import { errorText } from './util'

/** Datele firmei: apar pe facturile proforme și se completează singure în formularul de comandă. */
export function CompanySection() {
  const { backend, profile, refreshProfile } = useAccount()
  const [form, setForm] = useState<CompanyProfile>(() => profile ?? emptyProfile())
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const errors = showErrors ? profileErrors(form) : {}
  const set = (patch: Partial<CompanyProfile>) => {
    setForm((f) => ({ ...f, ...patch }))
    setMessage(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setShowErrors(true)
    if (Object.keys(profileErrors(form)).length > 0 || !backend) return
    setBusy(true)
    try {
      await backend.saveProfile(form)
      await refreshProfile()
      setMessage({ kind: 'ok', text: 'Datele firmei au fost salvate.' })
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="cab-section">
      <header className="cab-head">
        <div>
          <h2>Datele firmei</h2>
          <p className="muted">Apar pe facturile proforme și se completează singure când comandați.</p>
        </div>
      </header>
      <form className="cab-form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="grid">
          <Field label="Denumirea firmei *" value={form.name} error={errors.name} onChange={(e) => set({ name: e.target.value })} />
          <Field
            label="CUI (cod fiscal) *"
            placeholder="ex. RO12345678"
            inputMode="numeric"
            maxLength={13}
            value={form.cui}
            error={errors.cui}
            onChange={(e) => set({ cui: e.target.value })}
          />
          <Field
            label="Nr. Reg. Com."
            placeholder="ex. J40/1234/2020"
            value={form.regCom}
            onChange={(e) => set({ regCom: e.target.value })}
          />
          <Field
            label="Persoană de contact"
            value={form.contactPerson}
            onChange={(e) => set({ contactPerson: e.target.value })}
          />
          <Field
            label="Telefon *"
            type="tel"
            value={form.phone}
            error={errors.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
          <Field
            label="E-mail pentru comenzi *"
            type="email"
            value={form.email}
            error={errors.email}
            onChange={(e) => set({ email: e.target.value })}
          />
          <Field
            label="Adresa juridică"
            className="span-2"
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
          />
        </div>
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
        <div className="cab-form-actions">
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Se salvează…' : 'Salvează'}
          </button>
        </div>
      </form>
    </section>
  )
}

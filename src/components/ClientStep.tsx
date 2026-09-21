import type { InputHTMLAttributes } from 'react'
import type { ClientInfo } from '../lib/types'
import { clientErrors } from '../lib/validation'
import type { StepProps } from './stepProps'

export function ClientStep({ draft, update, showErrors }: StepProps) {
  const c = draft.client
  const errors = showErrors ? clientErrors(c) : {}
  const set = (patch: Partial<ClientInfo>) => update({ client: { ...c, ...patch } })

  const text = (key: keyof ClientInfo, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        value={c[key]}
        aria-invalid={!!errors[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        {...props}
      />
      {errors[key] && <small className="field-error">{errors[key]}</small>}
    </label>
  )

  return (
    <div className="step">
      <header className="step-head">
        <h2>Datele dvs.</h2>
        <p className="hint">Aceste date apar pe contul de plată. Câmpurile marcate cu * sunt obligatorii.</p>
      </header>

      <div className="segmented" role="radiogroup" aria-label="Tip client">
        {(
          [
            ['pj', 'Persoană juridică'],
            ['pf', 'Persoană fizică'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className={c.type === value ? 'is-active' : ''}>
            <input type="radio" name="clientType" checked={c.type === value} onChange={() => set({ type: value })} />
            <strong>{label}</strong>
          </label>
        ))}
      </div>

      <div className="grid">
        {text('name', c.type === 'pj' ? 'Denumirea firmei *' : 'Nume și prenume *', { autoComplete: c.type === 'pj' ? 'organization' : 'name' })}
        {c.type === 'pj' && text('idno', 'IDNO *', { inputMode: 'numeric', maxLength: 13 })}
        {c.type === 'pj' && text('contactPerson', 'Persoană de contact', { autoComplete: 'name' })}
        {text('phone', 'Telefon *', { type: 'tel', autoComplete: 'tel' })}
        {text('email', 'Email *', { type: 'email', autoComplete: 'email' })}
        <div className="span-2">{text('address', c.type === 'pj' ? 'Adresa juridică' : 'Adresa', { autoComplete: 'street-address' })}</div>
        <label className="field span-2">
          <span>Mențiuni</span>
          <textarea rows={3} value={c.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>
    </div>
  )
}

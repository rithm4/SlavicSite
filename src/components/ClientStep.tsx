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
        <h2>Datele firmei</h2>
        <p className="hint">Aceste date apar pe contul de plată. Câmpurile marcate cu * sunt obligatorii.</p>
      </header>

      <div className="grid">
        {text('name', 'Denumirea firmei *', { autoComplete: 'organization' })}
        {text('idno', 'IDNO *', { inputMode: 'numeric', maxLength: 13 })}
        {text('contactPerson', 'Persoană de contact', { autoComplete: 'name' })}
        {text('phone', 'Telefon *', { type: 'tel', autoComplete: 'tel' })}
        {text('email', 'Email *', { type: 'email', autoComplete: 'email' })}
        {text('address', 'Adresa juridică', { autoComplete: 'street-address' })}
        <label className="field span-2">
          <span>Mențiuni</span>
          <textarea rows={3} value={c.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>
    </div>
  )
}

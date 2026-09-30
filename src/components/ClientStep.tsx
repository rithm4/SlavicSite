import type { InputHTMLAttributes } from 'react'
import type { ClientInfo } from '../lib/types'
import { clientErrors } from '../lib/validation'
import type { StepProps } from './stepProps'

export function ClientStep({ draft, update, showErrors, fromAccount = false }: StepProps & { fromAccount?: boolean }) {
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
        aria-describedby={errors[key] ? `err-${key}` : undefined}
        onChange={(e) => set({ [key]: e.target.value })}
        {...props}
      />
      {errors[key] && (
        <small id={`err-${key}`} className="field-error">
          {errors[key]}
        </small>
      )}
    </label>
  )

  return (
    <div className="step">
      <header className="step-head">
        <h2>Datele firmei</h2>
        <p className="hint">
          {fromAccount
            ? 'Completate din contul firmei. Ce schimbați aici rămâne doar pe această comandă.'
            : 'Aceste date apar pe factura proformă. Câmpurile marcate cu * sunt obligatorii.'}
        </p>
      </header>

      <div className="grid">
        {text('name', 'Denumirea firmei *', { autoComplete: 'organization' })}
        {text('cui', 'CUI (cod fiscal) *', { placeholder: 'ex. RO12345678', maxLength: 12 })}
        {text('regCom', 'Nr. Reg. Com.', { placeholder: 'ex. J40/1234/2020' })}
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

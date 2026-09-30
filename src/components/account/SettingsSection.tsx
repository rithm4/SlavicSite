import { useState } from 'react'
import type { FormEvent } from 'react'
import { company } from '../../config/company'
import { useAccount } from '../../lib/account'
import { Field, Notice } from './shared'
import { errorText } from './util'

export function SettingsSection() {
  const { backend, user } = useAccount()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setMessage({ kind: 'error', text: 'Parola trebuie să aibă cel puțin 8 caractere.' })
    if (password !== password2) return setMessage({ kind: 'error', text: 'Parolele nu coincid.' })
    setBusy(true)
    try {
      await backend?.updatePassword(password)
      setPassword('')
      setPassword2('')
      setMessage({ kind: 'ok', text: 'Parola a fost schimbată.' })
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
          <h2>Setări</h2>
          <p className="muted">Intrați în cont cu {user?.email}.</p>
        </div>
      </header>

      <form className="cab-form" onSubmit={(e) => void submit(e)} noValidate>
        <h3>Schimbă parola</h3>
        <div className="grid">
          <Field
            label="Parolă nouă (minim 8 caractere)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field
            label="Repetați parola"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
        <div className="cab-form-actions">
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Se salvează…' : 'Schimbă parola'}
          </button>
        </div>
      </form>

      <div className="cab-block">
        <h3>Ștergerea contului</h3>
        <p className="muted">
          Scrieți-ne la <a href={`mailto:${company.email}`}>{company.email}</a> de pe adresa contului. Păstrăm doar
          documentele pe care legea contabilă ne obligă să le păstrăm.
        </p>
      </div>
    </section>
  )
}

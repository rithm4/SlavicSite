import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAccount } from '../../lib/account'
import { emptyProfile } from '../../lib/backend/types'
import type { CompanyProfile } from '../../lib/backend/types'
import { hashParams, href } from '../../lib/useRoute'
import { profileErrors } from '../../lib/validation'
import { Field, Notice } from './shared'
import { errorText } from './util'

type View = 'login' | 'register' | 'reset'

const MIN_PASSWORD = 8

/**
 * Intrare în cont, cont nou pentru firmă și resetarea parolei.
 * `admin`: intrarea separată a echipei, pentru panoul de administrare (fără cont nou).
 */
export function AuthPanel({ admin = false }: { admin?: boolean }) {
  const allowRegister = !admin
  const { backend } = useAccount()
  const [view, setView] = useState<View>(() => (allowRegister && hashParams().get('nou') === '1' ? 'register' : 'login'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile)
  const [agreed, setAgreed] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const switchTo = (next: View) => {
    setView(next)
    setMessage(null)
    setShowErrors(false)
  }

  const setP = (patch: Partial<CompanyProfile>) => setProfile((p) => ({ ...p, ...patch }))
  const pErrors = profileErrors({ ...profile, email })
  const passwordError =
    password.length < MIN_PASSWORD
      ? `Parola trebuie să aibă cel puțin ${MIN_PASSWORD} caractere.`
      : view === 'register' && password !== password2
        ? 'Parolele nu coincid.'
        : undefined

  const run = async (action: () => Promise<string | null>) => {
    if (!backend) return
    setBusy(true)
    setMessage(null)
    try {
      const ok = await action()
      if (ok) setMessage({ kind: 'ok', text: ok })
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!backend) return
    if (view === 'login') {
      void run(async () => {
        await backend.signIn(email.trim(), password)
        return null
      })
    } else if (view === 'reset') {
      void run(async () => {
        await backend.sendPasswordReset(email.trim())
        return backend.mode === 'demo'
          ? 'În modul demonstrativ nu se trimit e-mailuri. Cu Supabase conectat, aici pleacă linkul de resetare.'
          : `Dacă există un cont pentru ${email.trim()}, v-am trimis un link pentru o parolă nouă.`
      })
    } else {
      setShowErrors(true)
      if (Object.keys(pErrors).length > 0 || passwordError || !agreed) return
      void run(async () => {
        const { needsConfirmation } = await backend.signUp(email.trim(), password, { ...profile, email: email.trim() })
        return needsConfirmation
          ? `Contul a fost creat. V-am trimis un e-mail la ${email.trim()}: deschideți linkul din el ca să activați contul.`
          : null
      })
    }
  }

  const err = (key: keyof CompanyProfile) => (showErrors ? pErrors[key] : undefined)

  return (
    <div className={admin ? 'auth auth-single' : 'auth'}>
      <form className="auth-card" onSubmit={submit} noValidate>
        {view !== 'reset' && allowRegister && (
          <div className="auth-tabs" role="group" aria-label="Intrare sau cont nou">
            <button type="button" aria-pressed={view === 'login'} onClick={() => switchTo('login')}>
              Intră în cont
            </button>
            <button type="button" aria-pressed={view === 'register'} onClick={() => switchTo('register')}>
              Cont nou<span className="hide-sm"> pentru firmă</span>
            </button>
          </div>
        )}
        {view === 'reset' && (
          <header className="auth-head">
            <h2>Parolă uitată</h2>
            <p className="muted">Introduceți e-mailul contului și vă trimitem un link pentru o parolă nouă.</p>
          </header>
        )}

        {admin && view === 'login' && (
          <header className="auth-head">
            <h2>Intrare pentru echipa EUROVYPCUC</h2>
            <p className="muted">Panoul de administrare: comenzile, clienții și documentele lor.</p>
          </header>
        )}

        {view === 'login' && backend?.mode === 'demo' && (
          <p className="demo-note">
            {admin
              ? 'Mod demonstrativ: intrați cu orice e-mail și orice parolă, ca administrator. Vedeți comenzile tuturor conturilor de probă.'
              : 'Mod demonstrativ: intrați cu orice e-mail și orice parolă. Contul se deschide singur, cu câteva comenzi și documente de probă.'}
          </p>
        )}

        {view === 'register' && (
          <div className="grid">
            <Field
              label="Denumirea firmei *"
              autoComplete="organization"
              value={profile.name}
              error={err('name')}
              onChange={(e) => setP({ name: e.target.value })}
            />
            <Field
              label="CUI (cod fiscal) *"
              placeholder="ex. RO12345678"
              maxLength={12}
              value={profile.cui}
              error={err('cui')}
              onChange={(e) => setP({ cui: e.target.value })}
            />
            <Field
              label="Nr. Reg. Com."
              placeholder="ex. J40/1234/2020"
              value={profile.regCom}
              onChange={(e) => setP({ regCom: e.target.value })}
            />
            <Field
              label="Persoană de contact"
              autoComplete="name"
              value={profile.contactPerson}
              onChange={(e) => setP({ contactPerson: e.target.value })}
            />
            <Field
              label="Telefon *"
              type="tel"
              autoComplete="tel"
              value={profile.phone}
              error={err('phone')}
              onChange={(e) => setP({ phone: e.target.value })}
            />
            <Field
              label="Adresa juridică"
              autoComplete="street-address"
              value={profile.address}
              onChange={(e) => setP({ address: e.target.value })}
            />
          </div>
        )}

        <div className="grid">
          <Field
            label={view === 'register' ? 'E-mail (pentru intrarea în cont) *' : 'E-mail'}
            type="email"
            autoComplete="email"
            className="span-2"
            value={email}
            error={view === 'register' ? err('email') : undefined}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {view !== 'reset' && (
            <Field
              label={view === 'register' ? `Parolă * (minim ${MIN_PASSWORD} caractere)` : 'Parolă'}
              type="password"
              autoComplete={view === 'register' ? 'new-password' : 'current-password'}
              className={view === 'register' ? '' : 'span-2'}
              value={password}
              error={view === 'register' && showErrors ? passwordError : undefined}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          {view === 'register' && (
            <Field
              label="Repetați parola *"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          )}
        </div>

        {view === 'register' && (
          <label className="check auth-agree">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>
              Am citit <a href={href('confidentialitate')}>politica de confidențialitate</a> și sunt de acord cu
              prelucrarea datelor firmei.
            </span>
          </label>
        )}
        {view === 'register' && showErrors && !agreed && (
          <small className="field-error">Bifați acordul ca să puteți crea contul.</small>
        )}

        {message && <Notice kind={message.kind}>{message.text}</Notice>}

        <div className="auth-actions">
          <button type="submit" className="btn" disabled={busy || !backend}>
            {busy ? 'Se trimite…' : view === 'login' ? 'Intră în cont' : view === 'register' ? 'Creează contul' : 'Trimite linkul'}
          </button>
          {view === 'login' && (
            <button type="button" className="btn-link" onClick={() => switchTo('reset')}>
              Am uitat parola
            </button>
          )}
          {view === 'reset' && (
            <button type="button" className="btn-link" onClick={() => switchTo('login')}>
              Înapoi la intrare
            </button>
          )}
        </div>
      </form>

      {allowRegister && (
        <aside className="auth-aside">
          <h2>Ce găsiți în cont</h2>
          <dl>
            <div>
              <dt>Comenzile și statusul lor</dt>
              <dd>Vedeți când e primită plata, când intră în producție și când e gata comanda.</dd>
            </div>
            <div>
              <dt>Comandă în câteva clicuri</dt>
              <dd>Datele firmei și adresele de livrare se completează singure; o comandă veche se repetă dintr-un buton.</dd>
            </div>
            <div>
              <dt>Documentele la un loc</dt>
              <dd>Facturi proforme, facturi și certificate ISPM 15, gata de descărcat oricând.</dd>
            </div>
          </dl>
        </aside>
      )}
    </div>
  )
}

/** După linkul de resetare: clientul alege parola nouă. */
export function NewPassword() {
  const { backend, endRecovery } = useAccount()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) {
      setMessage({ kind: 'error', text: `Parola trebuie să aibă cel puțin ${MIN_PASSWORD} caractere.` })
      return
    }
    if (password !== password2) {
      setMessage({ kind: 'error', text: 'Parolele nu coincid.' })
      return
    }
    setBusy(true)
    try {
      await backend?.updatePassword(password)
      endRecovery()
      // rămânem pe aceeași pagină (cont sau panou), fără ?reset=1
      history.replaceState(null, '', location.hash.split('?')[0])
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-card auth-narrow" onSubmit={submit} noValidate>
      <header className="auth-head">
        <h2>Parolă nouă</h2>
        <p className="muted">Alegeți parola cu care veți intra de acum în cont.</p>
      </header>
      <div className="grid">
        <Field
          label={`Parolă nouă (minim ${MIN_PASSWORD} caractere)`}
          type="password"
          autoComplete="new-password"
          className="span-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Repetați parola"
          type="password"
          autoComplete="new-password"
          className="span-2"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
      </div>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="auth-actions">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Se salvează…' : 'Salvează parola'}
        </button>
      </div>
    </form>
  )
}

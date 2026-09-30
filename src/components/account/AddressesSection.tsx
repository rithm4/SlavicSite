import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAccount } from '../../lib/account'
import type { DeliveryAddress } from '../../lib/backend/types'
import { Field, Notice } from './shared'
import { errorText } from './util'

type Draft = Omit<DeliveryAddress, 'id'> & { id?: string }
const blank = (): Draft => ({ label: '', address: '', isDefault: false })

/** Adresele de livrare salvate; în formularul de comandă se aleg dintr-un clic. */
export function AddressesSection() {
  const { backend } = useAccount()
  const [list, setList] = useState<DeliveryAddress[]>([])
  const [editing, setEditing] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!backend) return
    try {
      setList(await backend.listAddresses())
    } catch (e) {
      setError(errorText(e))
    }
  }, [backend])

  useEffect(() => {
    if (!backend) return
    let cancelled = false
    backend
      .listAddresses()
      .then((l) => !cancelled && setList(l))
      .catch((e: unknown) => !cancelled && setError(errorText(e)))
    return () => {
      cancelled = true
    }
  }, [backend])

  const act = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!editing || !backend) return
    if (!editing.address.trim()) {
      setError('Introduceți adresa.')
      return
    }
    void act(async () => {
      await backend.saveAddress({ ...editing, isDefault: editing.isDefault || list.length === 0 })
      setEditing(null)
    })
  }

  return (
    <section className="cab-section">
      <header className="cab-head">
        <div>
          <h2>Adrese de livrare</h2>
          <p className="muted">Adresa implicită se pune singură în comandă când alegeți livrarea.</p>
        </div>
        {!editing && (
          <button type="button" className="btn" onClick={() => setEditing(blank())}>
            Adaugă adresă
          </button>
        )}
      </header>

      {editing && (
        <form className="cab-form address-form" onSubmit={submit} noValidate>
          <div className="grid">
            <Field
              label="Denumire (ex. Depozit Hîncești)"
              value={editing.label}
              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            />
            <Field
              label="Adresa *"
              placeholder="Localitate, stradă, număr"
              value={editing.address}
              onChange={(e) => setEditing({ ...editing, address: e.target.value })}
            />
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={editing.isDefault}
              onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
            />
            <span>Adresa implicită pentru livrări</span>
          </label>
          <div className="cab-form-actions">
            <button type="submit" className="btn" disabled={busy}>
              Salvează adresa
            </button>
            <button type="button" className="btn-link" onClick={() => setEditing(null)}>
              Renunță
            </button>
          </div>
        </form>
      )}

      {error && <Notice kind="error">{error}</Notice>}

      {list.length === 0 && !editing ? (
        <p className="muted">Nu aveți încă adrese salvate.</p>
      ) : (
        <ul className="address-list">
          {list.map((a) => (
            <li key={a.id}>
              <div>
                <strong>{a.label || 'Adresă de livrare'}</strong>
                {a.isDefault && <span className="tag">Implicită</span>}
                <p>{a.address}</p>
              </div>
              <div className="address-actions">
                {!a.isDefault && (
                  <button
                    type="button"
                    className="btn-link"
                    disabled={busy}
                    onClick={() => void act(() => backend!.saveAddress({ ...a, isDefault: true }))}
                  >
                    Fă implicită
                  </button>
                )}
                <button type="button" className="btn-link" disabled={busy} onClick={() => setEditing(a)}>
                  Modifică
                </button>
                <button
                  type="button"
                  className="btn-link danger"
                  disabled={busy}
                  onClick={() => void act(() => backend!.deleteAddress(a.id))}
                >
                  Șterge
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

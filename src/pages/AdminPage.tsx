import { AccountProvider } from '../components/account/AccountProvider'
import { AuthPanel, NewPassword } from '../components/account/AuthPanel'
import { AdminPanel } from '../components/admin/AdminPanel'
import { PageHero } from '../components/site/PageHero'
import { useAccount } from '../lib/account'

/**
 * Panoul de administrare: pagină separată, cu intrare și sesiune proprii. Nu apare în meniul site-ului
 * și nici în contul clientului; intrarea în panou nu schimbă contul de client deschis în același browser.
 */
export function AdminPage() {
  return (
    <AccountProvider scope="admin">
      <PageHero title="Panou admin" compact />
      <section className="band band-tight work-band">
        <div className="container">
          <AdminGate />
        </div>
      </section>
    </AccountProvider>
  )
}

function AdminGate() {
  const { ready, user, backend, recovery } = useAccount()
  if (!ready) return <p className="muted" role="status">Se încarcă…</p>
  if (recovery) return <NewPassword />
  if (!user) return <AuthPanel admin />
  if (!user.isAdmin) {
    return (
      <div className="access-note">
        <p>
          Contul <strong>{user.email}</strong> nu are drepturi de administrator.
        </p>
        <div className="access-actions">
          <button type="button" className="btn" onClick={() => void backend?.signOut()}>
            Intră cu alt cont
          </button>
        </div>
      </div>
    )
  }
  return <AdminPanel />
}

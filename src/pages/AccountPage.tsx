import { AuthPanel, NewPassword } from '../components/account/AuthPanel'
import { Cabinet } from '../components/account/Cabinet'
import { PageHero } from '../components/site/PageHero'
import { useAccount } from '../lib/account'

export function AccountPage() {
  const { ready, user, recovery } = useAccount()
  const working = ready && !!user && !recovery
  return (
    <>
      {working ? (
        <PageHero title="Contul firmei" compact />
      ) : (
        <PageHero title="Contul firmei">
          Intrați în cont sau creați unul pentru firmă: comenzile, statusul lor și documentele, într-un singur loc.
        </PageHero>
      )}
      <section className={working ? 'band band-tight work-band' : 'band band-tight'}>
        <div className="container">
          {!ready ? <p className="muted" role="status">Se încarcă…</p> : recovery ? <NewPassword /> : user ? <Cabinet /> : <AuthPanel />}
        </div>
      </section>
    </>
  )
}

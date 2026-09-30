import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AccountContext } from '../../lib/account'
import { getBackend } from '../../lib/backend'
import type { AccountUser, Backend, BackendScope, CompanyProfile } from '../../lib/backend/types'

/**
 * Ține minte cine e autentificat și profilul firmei. Pentru tot site-ul, sesiunea contului de client;
 * panoul admin își pune propriul provider (scope="admin"), cu sesiunea lui separată.
 */
export function AccountProvider({ children, scope = 'client' }: { children: ReactNode; scope?: BackendScope }) {
  const [backend, setBackend] = useState<Backend | null>(null)
  const [user, setUser] = useState<AccountUser | null>(null)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    let off = () => {}
    let cancelled = false
    getBackend(scope)
      .then((b) => {
        if (cancelled) return
        setBackend(b)
        off = b.onAuthChange((next, event) => {
          setUser(next)
          if (event === 'recovery') setRecovery(true)
          if (!next) setProfile(null)
          // administratorul nu are profil de firmă
          const loading = next && scope === 'client' ? b.getProfile().catch(() => null) : Promise.resolve(null)
          void loading.then((p) => {
            setProfile(p)
            setReady(true)
          })
        })
      })
      .catch(() => setReady(true))
    return () => {
      cancelled = true
      off()
    }
  }, [scope])

  const refreshProfile = useCallback(async () => {
    if (backend && user && scope === 'client') setProfile(await backend.getProfile())
  }, [backend, user, scope])

  const value = useMemo(
    () => ({ backend, user, profile, ready, recovery, endRecovery: () => setRecovery(false), refreshProfile }),
    [backend, user, profile, ready, recovery, refreshProfile],
  )
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

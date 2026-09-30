import type { Backend, BackendScope } from './types'

const backends: Partial<Record<BackendScope, Promise<Backend>>> = {}

/**
 * Serverul site-ului: Supabase, dacă sunt setate VITE_SUPABASE_URL și VITE_SUPABASE_ANON_KEY
 * (vezi supabase/README.md), altfel modul demonstrativ. Codul fiecăruia se încarcă doar la nevoie.
 *
 * Contul de client și panoul admin au sesiuni separate (`scope`): intrarea într-unul nu o închide
 * și nu o înlocuiește pe cealaltă, iar datele sunt aceleași.
 */
export function getBackend(scope: BackendScope = 'client'): Promise<Backend> {
  backends[scope] ??= (async () => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (url && key) {
      const { createSupabaseBackend } = await import('./supabase')
      return createSupabaseBackend(url, key, scope)
    }
    const { createDemoBackend } = await import('./demo')
    return createDemoBackend(scope)
  })()
  return backends[scope]
}

import { createContext, useContext } from 'react'
import type { AccountUser, Backend, CompanyProfile } from './backend/types'

export interface AccountState {
  /** null până se încarcă serverul */
  backend: Backend | null
  user: AccountUser | null
  profile: CompanyProfile | null
  /** false până se află dacă e cineva autentificat */
  ready: boolean
  /** clientul a venit din linkul de resetare a parolei și trebuie să aleagă una nouă */
  recovery: boolean
  endRecovery(): void
  refreshProfile(): Promise<void>
}

export const AccountContext = createContext<AccountState | null>(null)

export function useAccount(): AccountState {
  const state = useContext(AccountContext)
  if (!state) throw new Error('useAccount se folosește în interiorul AccountProvider')
  return state
}

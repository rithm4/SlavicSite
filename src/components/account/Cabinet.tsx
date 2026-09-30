import { FileText, Home, LogOut, MapPin, Package, Settings, Building2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useAccount } from '../../lib/account'
import type { DocumentRecord, OrderRecord } from '../../lib/backend/types'
import { useKeepInView } from '../../lib/useKeepInView'
import { useHashParam } from '../../lib/useRoute'
import { AddressesSection } from './AddressesSection'
import { CompanySection } from './CompanySection'
import { DocumentsSection } from './DocumentsSection'
import { OrdersSection } from './OrdersSection'
import { Overview } from './Overview'
import { SettingsSection } from './SettingsSection'
import { Notice } from './shared'
import { errorText } from './util'

const sections: { id: string; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: 'prezentare', label: 'Prezentare', icon: Home },
  { id: 'comenzi', label: 'Comenzi', icon: Package },
  { id: 'firma', label: 'Datele firmei', icon: Building2 },
  { id: 'adrese', label: 'Adrese de livrare', icon: MapPin },
  { id: 'documente', label: 'Documente', icon: FileText },
  { id: 'setari', label: 'Setări', icon: Settings },
]

export interface CabinetData {
  orders: OrderRecord[]
  documents: DocumentRecord[]
  loading: boolean
  reload(): void
}

/** Cabinetul firmei: meniul din stânga și secțiunea aleasă (#/cont?sectiune=…). */
export function Cabinet() {
  const { backend, user, profile } = useAccount()
  const section = useHashParam('sectiune') ?? 'prezentare'
  const mainRef = useRef<HTMLDivElement>(null)
  useKeepInView(mainRef, section)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!backend) return
    let cancelled = false
    Promise.all([backend.listMyOrders(), backend.listMyDocuments()])
      .then(([o, d]) => {
        if (cancelled) return
        setOrders(o)
        setDocuments(d)
        setError(null)
      })
      .catch((e: unknown) => !cancelled && setError(errorText(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [backend, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const data: CabinetData = { orders, documents, loading, reload }

  return (
    <div className="cab">
      <aside className="cab-nav">
        <div className="cab-who">
          <strong>{profile?.name || 'Firma dumneavoastră'}</strong>
          <span>{user?.email}</span>
        </div>
        <nav aria-label="Secțiunile contului">
          {sections.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#/cont?sectiune=${id}`} aria-current={section === id ? 'page' : undefined}>
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>
        <button type="button" className="cab-logout" onClick={() => void backend?.signOut()}>
          <LogOut size={18} />
          Ieșire din cont
        </button>
      </aside>

      <div className="cab-main" ref={mainRef}>
        {backend?.mode === 'demo' && (
          <p className="demo-note">
            Mod demonstrativ: conturile și comenzile se păstrează doar în acest browser. Conturile reale pornesc după
            conectarea Supabase (pașii sunt în supabase/README.md).
          </p>
        )}
        {error && <Notice kind="error">{error}</Notice>}
        {section === 'prezentare' && <Overview data={data} />}
        {section === 'comenzi' && <OrdersSection data={data} />}
        {section === 'firma' && <CompanySection />}
        {section === 'adrese' && <AddressesSection />}
        {section === 'documente' && <DocumentsSection data={data} />}
        {section === 'setari' && <SettingsSection />}
      </div>
    </div>
  )
}

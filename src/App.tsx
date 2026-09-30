import { lazy, Suspense, useEffect, useRef } from 'react'
import { AccountProvider } from './components/account/AccountProvider'
import { Footer } from './components/site/Footer'
import { Header } from './components/site/Header'
import { startSmoothScroll } from './lib/smoothScroll'
import { useReveal } from './lib/useReveal'
import { pageTitles, useRoute } from './lib/useRoute'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProductsPage } from './pages/ProductsPage'
import './App.css'
import './site.css'
import './account.css'

// Formularul de comandă, contul și panoul admin se încarcă doar când e nevoie de ele.
const OrderPage = lazy(() => import('./pages/OrderPage').then((m) => ({ default: m.OrderPage })))
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))

function App() {
  const route = useRoute()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  useReveal()
  useEffect(() => startSmoothScroll(), [])

  useEffect(() => {
    document.title = pageTitles[route]
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    // la o pagină nouă, focusul trece pe titlul ei: cititoarele de ecran o anunță, iar Tab pornește de acolo
    const frame = requestAnimationFrame(() => {
      const target = mainRef.current?.querySelector<HTMLElement>('h1') ?? mainRef.current
      if (!target) return
      target.tabIndex = -1
      target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [route])

  return (
    <AccountProvider>
      <div className="site">
        <button type="button" className="skip-link" onClick={() => mainRef.current?.focus()}>
          Sari la conținut
        </button>
        <Header route={route} />
        <main ref={mainRef} className="site-main" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                Se încarcă…
              </div>
            }
          >
            {route === 'acasa' && <HomePage />}
            {route === 'produse' && <ProductsPage />}
            {route === 'despre' && <AboutPage />}
            {route === 'comanda' && <OrderPage />}
            {route === 'contacte' && <ContactPage />}
            {route === 'confidentialitate' && <PrivacyPage />}
            {route === 'cont' && <AccountPage />}
            {route === 'admin' && <AdminPage />}
            {route === 'negasit' && <NotFoundPage />}
          </Suspense>
        </main>
        <Footer />
      </div>
    </AccountProvider>
  )
}

export default App

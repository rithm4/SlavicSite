import { ChevronRight, Menu, Phone, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { company } from '../../config/company'
import { useAccount } from '../../lib/account'
import { href, navItems, type Page } from '../../lib/useRoute'
import { Logo } from './Logo'

export function Header({ route }: { route: Page }) {
  const { user } = useAccount()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const tel = `tel:${company.phone.replace(/\s/g, '')}`

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // meniul de pe telefon se închide la altă pagină (și la „Înapoi”), la Escape și la un clic în afara lui
  const [lastRoute, setLastRoute] = useState(route)
  if (route !== lastRoute) {
    setLastRoute(route)
    setOpen(false)
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <header ref={headerRef} className={scrolled || open ? 'site-header is-scrolled' : 'site-header'}>
      <div className="container site-header-inner">
        <a href={href('acasa')} aria-label="EUROVYPCUC — pagina principală">
          <Logo />
        </a>

        <div className="header-mobile">
          <a className="header-call" href={tel} aria-label={`Sunați: ${company.phone}`}>
            <Phone size={19} aria-hidden="true" />
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">Meniu</span>
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>

        <nav
          id="site-nav"
          aria-label="Meniul principal"
          className={open ? 'site-nav is-open' : 'site-nav'}
          onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}
        >
          {navItems.map((item) => (
            <a key={item.route} href={href(item.route)} aria-current={route === item.route ? 'page' : undefined}>
              {item.label}
            </a>
          ))}
          <a className="header-phone" href={tel}>
            <Phone size={16} aria-hidden="true" />
            {company.phone}
          </a>
          {/* contul de client; panoul admin are adresa lui și nu apare în meniu.
              Pe telefon e un card separat de pagini, cu subtitlul și săgeata vizibile doar acolo */}
          <a className="header-account" href={href('cont')} aria-current={route === 'cont' ? 'page' : undefined}>
            <span className="header-account-icon">
              <UserRound size={17} aria-hidden="true" />
            </span>
            <span className="header-account-text">
              {user ? 'Contul meu' : 'Intră în cont'}
              <small>Comenzile și documentele firmei</small>
            </span>
            <ChevronRight className="header-account-chevron" size={18} aria-hidden="true" />
          </a>
          <a className="btn nav-cta" href={href('comanda')} aria-current={route === 'comanda' ? 'page' : undefined}>
            Comandă online
          </a>
        </nav>
      </div>
    </header>
  )
}

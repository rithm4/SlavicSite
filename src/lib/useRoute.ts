import { useEffect, useState } from 'react'
import { scrollToY } from './smoothScroll'

// Navigare prin „#/pagina” — funcționează pe orice găzduire statică (GitHub Pages, Netlify)
// fără reguli de rescriere pe server.

export const routes = ['acasa', 'produse', 'despre', 'comanda', 'contacte', 'confidentialitate', 'cont', 'admin'] as const
export type Route = (typeof routes)[number]
/** Pagina afișată: una din rute sau „negăsit”, pentru o adresă greșită. */
export type Page = Route | 'negasit'

export const navItems: { route: Route; label: string }[] = [
  { route: 'acasa', label: 'Acasă' },
  { route: 'produse', label: 'Produse' },
  { route: 'despre', label: 'Despre noi' },
  { route: 'contacte', label: 'Contacte' },
]

const SITE = 'EUROVYPCUC'

/** Titlul din tab-ul browserului, pentru fiecare pagină. */
export const pageTitles: Record<Page, string> = {
  acasa: `${SITE} — elemente din lemn pentru lădițe`,
  produse: `Produse și prețuri — ${SITE}`,
  despre: `Despre noi — ${SITE}`,
  comanda: `Comandă online — ${SITE}`,
  contacte: `Contacte — ${SITE}`,
  confidentialitate: `Politica de confidențialitate — ${SITE}`,
  cont: `Contul firmei — ${SITE}`,
  admin: `Panou admin — ${SITE}`,
  negasit: `Pagina nu există — ${SITE}`,
}

export const href = (route: Route) => (route === 'acasa' ? '#/' : `#/${route}`)

/** Link spre formular cu un produs din catalog deja adăugat în comandă. */
export const orderHref = (productId: string) => `#/comanda?produs=${encodeURIComponent(productId)}`

/** Parametrii din partea „?…” a hash-ului, ex. #/comanda?produs=laterala. */
export const hashParams = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '')

/** Un parametru din hash, actualizat la fiecare schimbare (ex. secțiunea din cabinet: #/cont?sectiune=comenzi). */
export function useHashParam(name: string): string | null {
  const [value, setValue] = useState(() => hashParams().get(name))
  useEffect(() => {
    const onChange = () => setValue(hashParams().get(name))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [name])
  return value
}

function parse(hash: string): Page {
  const name = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  if (!name) return 'acasa'
  return (routes as readonly string[]).includes(name) ? (name as Route) : 'negasit'
}

export function useRoute(): Page {
  const [route, setRoute] = useState<Page>(() => parse(window.location.hash))

  useEffect(() => {
    let current = parse(window.location.hash)
    const onChange = () => {
      const next = parse(window.location.hash)
      // sus urcăm doar la o pagină nouă; în aceeași pagină (ex. secțiunile cabinetului) poziția rămâne
      if (next !== current) scrollToY(0)
      current = next
      setRoute(next)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

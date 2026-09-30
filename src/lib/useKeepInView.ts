import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { scrollToY } from './smoothScroll'

/**
 * La schimbarea secțiunii (`key`), pagina nu sare sus. Doar dacă începutul zonei a ieșit deasupra
 * ecranului, o aduce lin sub antet, ca secțiunea nouă să se vadă de la început.
 */
export function useKeepInView(ref: RefObject<HTMLElement | null>, key: string) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = ref.current
    if (!el) return
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
    const top = el.getBoundingClientRect().top
    if (top < header) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scrollToY(window.scrollY + top - header - 12, !reduce)
    }
  }, [ref, key])
}

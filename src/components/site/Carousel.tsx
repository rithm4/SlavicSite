import { Children, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Grilă care pe telefon devine un șir derulabil pe orizontală (vezi `.is-carousel` în CSS),
 * cu puncte dedesubt care arată unde sunteți și că mai urmează carduri. Pe ecran mare punctele nu apar.
 */
export function Carousel({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const count = Children.count(children)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const first = el.children[0] as HTMLElement | undefined
      if (!first) return
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        setActive(count - 1)
        return
      }
      const step = first.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 0)
      setActive(Math.min(count - 1, Math.round(el.scrollLeft / step)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [count])

  const go = (index: number) => {
    const el = ref.current
    const first = el?.children[0] as HTMLElement | undefined
    const child = el?.children[index] as HTMLElement | undefined
    if (!el || !first || !child) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // distanța față de primul card = cât trebuie derulat ca acest card să ajungă în locul lui
    el.scrollTo({ left: child.offsetLeft - first.offsetLeft, behavior: still ? 'auto' : 'smooth' })
  }

  return (
    <>
      <div ref={ref} className={`${className} is-carousel`}>
        {children}
      </div>
      <div className="carousel-dots" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" tabIndex={-1} className={i === active ? 'is-active' : ''} onClick={() => go(i)} />
        ))}
      </div>
    </>
  )
}

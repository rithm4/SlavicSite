import { useEffect } from 'react'

/**
 * Elementele cu clasa `reveal` apar ușor când intră în ecran.
 * Urmărește și elementele adăugate mai târziu (pagini încărcate separat, secțiuni care apar după date).
 * Fără IntersectionObserver, totul e vizibil direct.
 */
export function useReveal() {
  useEffect(() => {
    const show = (el: Element) => el.classList.add('is-visible')
    const pending = () => document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)')

    if (!('IntersectionObserver' in window)) {
      const all = () => pending().forEach(show)
      all()
      const mutations = new MutationObserver(all)
      mutations.observe(document.body, { childList: true, subtree: true })
      return () => mutations.disconnect()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show(entry.target)
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    // ce urmărește deja acest observator (la o nouă rulare a efectului, lista începe de la zero)
    const watched = new WeakSet<Element>()
    const watch = () =>
      pending().forEach((el) => {
        if (watched.has(el)) return
        watched.add(el)
        observer.observe(el)
      })
    watch()
    const mutations = new MutationObserver(watch)
    mutations.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [])
}

import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

/** Evenimentul trimis după fiecare recalculare, ca lădița 3D să-și măsoare din nou intervalul. */
export const HERO_PIN_EVENT = 'heropin'

/**
 * Primul ecran „stă pe loc” cât timp lădița se asamblează, apoi pagina merge mai departe. Modurile:
 *  - `lock`: pe calculator (mouse, trackpad), când lădița se vede întreagă de la încărcare — pagina nu se mișcă
 *    deloc: primele una-două mișcări de rotiță asamblează lădița, abia următoarea derulează (vezi CrateAssembly);
 *  - `hero`: tot primul ecran stă fixat (`position: sticky`) cât se derulează asamblarea — ecrane tactile late;
 *  - `bento`: doar cardurile cu lădița stau fixate, centrate — pe telefon;
 *  - `none`: nimic nu încape (telefon culcat) sau vizitatorul a cerut mișcare redusă.
 * La modurile cu fixare, pe elementul fixat se pune `data-pin-track`, iar pe secțiune `--pin-top` și `--pin-distance`.
 */
export function useHeroPin(heroRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const hero = heroRef.current
    const pin = hero?.querySelector<HTMLElement>('.hero-pin')
    const track = hero?.querySelector<HTMLElement>('.hero-bento-track')
    const bento = hero?.querySelector<HTMLElement>('.hero-bento')
    if (!hero || !pin || !track || !bento) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const desktop = window.matchMedia('(hover: hover) and (pointer: fine)')
    let lastWidth = 0
    let lastHeight = 0

    const update = () => {
      lastWidth = window.innerWidth
      lastHeight = window.innerHeight
      // întâi fără fixare, ca să măsurăm înălțimile firești
      hero.dataset.pin = 'none'
      hero.removeAttribute('data-pin-track')
      track.removeAttribute('data-pin-track')

      let mode: 'lock' | 'hero' | 'bento' | 'none' = 'none'
      let top = 0
      if (!still.matches) {
        const vh = window.innerHeight
        const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
        const padTop = parseFloat(getComputedStyle(hero).paddingTop) || 0
        const margin = 12
        // în varianta „split” cardurile sunt celule ale grilei mari, nu un bloc separat care să poată sta fixat
        const split = getComputedStyle(bento).display === 'contents'
        const card = hero.querySelector<HTMLElement>('.hb-image')
        const cardOffset = card ? card.getBoundingClientRect().top - pin.getBoundingClientRect().top : 0
        const cardHeight = card?.offsetHeight ?? 0
        const cardDocTop = card ? card.getBoundingClientRect().top + window.scrollY : 0
        if (desktop.matches && card && cardDocTop >= header && cardDocTop + cardHeight <= vh) {
          // lădița se vede întreagă chiar de sus: pagina rămâne pe loc până e asamblată
          mode = 'lock'
        } else if (header + margin + pin.offsetHeight <= vh - margin) {
          mode = 'hero'
          // de la încărcare, dacă încape; altfel din clipa în care e tot în ecran
          top = Math.min(header + padTop, vh - pin.offsetHeight - margin)
        } else if (split) {
          // nu încape tot: se fixează cu marginea de jos a ecranului, dacă lădița se vede întreagă
          const bottomTop = vh - pin.offsetHeight - margin
          if (bottomTop + cardOffset >= header + margin && bottomTop + cardOffset + cardHeight <= vh - margin) {
            mode = 'hero'
            top = bottomTop
          }
        } else if (header + margin + bento.offsetHeight <= vh - margin) {
          mode = 'bento'
          top = Math.round(header + (vh - header - bento.offsetHeight) / 2)
        }
      }

      // cât se derulează pe loc (modurile cu fixare): lădița e gata după ~două mișcări, apoi mai stă o clipă
      const distance = Math.round(Math.min(Math.max(window.innerHeight * 0.34, 280), 380))
      hero.dataset.pin = mode
      hero.style.setProperty('--pin-top', `${top}px`)
      hero.style.setProperty('--pin-distance', `${distance}px`)
      if (mode === 'hero') hero.setAttribute('data-pin-track', '')
      if (mode === 'bento') track.setAttribute('data-pin-track', '')
      window.dispatchEvent(new Event(HERO_PIN_EVENT))
    }

    // pe telefon bara de adrese schimbă înălțimea la derulare: recalculăm doar la schimbări reale
    const onResize = () => {
      if (window.innerWidth !== lastWidth || Math.abs(window.innerHeight - lastHeight) > 140) update()
    }

    update()
    // fonturile încărcate mai târziu schimbă înălțimea titlului
    void document.fonts?.ready.then(update)
    window.addEventListener('resize', onResize)
    still.addEventListener('change', update)
    desktop.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', onResize)
      still.removeEventListener('change', update)
      desktop.removeEventListener('change', update)
    }
  }, [heroRef])
}

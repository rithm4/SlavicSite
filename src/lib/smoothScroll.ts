import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

// Derulare lină pe calculator (rotița mouse-ului „alunecă” în loc să sară cu câte 100 px).
// Pe telefon și la „mișcare redusă” rămâne derularea nativă a browserului.

/** Cine poate folosi rotița înaintea paginii (ex. lădița din primul ecran). Întoarce true dacă a folosit-o. */
export type WheelGate = (deltaY: number, event: WheelEvent) => boolean

let lenis: Lenis | null = null
const gates = new Set<WheelGate>()

export function startSmoothScroll(): () => void {
  const desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!desktop || still || lenis) return () => {}
  const instance = new Lenis({
    autoRaf: true,
    // cât de repede ajunge pagina din urmă rotița: mic = mai lin
    lerp: 0.085,
    wheelMultiplier: 0.9,
    // listele și tabelele cu derulare proprie (rezumatul comenzii, tabele) se derulează ele, nu pagina
    allowNestedScroll: true,
    virtualScroll: ({ deltaY, event }) => {
      if (!(event instanceof WheelEvent)) return true
      for (const gate of gates) {
        if (gate(deltaY, event)) {
          if (event.cancelable) event.preventDefault()
          return false
        }
      }
      return true
    },
  })
  lenis = instance
  return () => {
    instance.destroy()
    if (lenis === instance) lenis = null
  }
}

export function addWheelGate(gate: WheelGate): () => void {
  gates.add(gate)
  return () => gates.delete(gate)
}

export const isSmoothScrolling = () => lenis !== null

/** Derulare la o poziție: prin derularea lină când e pornită (ca să nu se „certe” cu ea), altfel nativ. */
export function scrollToY(y: number, smooth = false) {
  if (lenis) lenis.scrollTo(y, { immediate: !smooth, force: true })
  else window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' })
}

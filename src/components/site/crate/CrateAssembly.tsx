import { useEffect, useRef, useState } from 'react'
import fallbackImage from '../../../assets/crate-hero.webp'
import { addWheelGate, isSmoothScrolling } from '../../../lib/smoothScroll'
import { HERO_PIN_EVENT } from '../../../lib/useHeroPin'

type Status = 'loading' | 'ready' | 'failed'

/** Pe calculator: cât durează asamblarea întreagă (desfacerea, la fel), în milisecunde. */
const PLAY_MS = 1300
/** Din ce parte a redării lădița arată gata și pagina se poate derula (restul sunt ultimele capse). */
const RELEASE_AT = 0.82
/** Pe telefon (lădița urmează derularea): în cât timp o ajunge din urmă, în secunde. */
const SMOOTH_TIME_SCROLL = 0.32
/**
 * Când e o mișcare nouă de rotiță (nu restul celei vechi): după o pauză mai lungă de atât, sau când pasul nu scade.
 * Inerția unui trackpad trimite pași tot mai mici; clicurile rotiței mouse-ului au pași egali, deci fiecare contează.
 */
const GESTURE_GAP = 120
const MIN_NOTCH = 40

/** Pornire și oprire domoale, pentru redarea asamblării (piesele au în plus fiecare curba lor). */
const easeInOutSine = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2

/** Arc amortizat critic (ca SmoothDamp din motoarele de jocuri): mișcare lină spre țintă, fără oscilații. */
function smoothDamp(current: number, target: number, velocity: number, smoothTime: number, dt: number) {
  const omega = 2 / smoothTime
  const x = omega * dt
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const change = current - target
  const temp = (velocity + omega * change) * dt
  let nextVelocity = (velocity - omega * temp) * decay
  let value = target + (change + temp) * decay
  // nu trece de țintă
  if (target - current > 0 === value > target) {
    value = target
    nextVelocity = 0
  }
  return { value, velocity: nextVelocity }
}

/**
 * Lădița din primul ecran: pornește desfăcută în elemente și se asamblează.
 *  - Pe calculator (modul `lock` din useHeroPin) pagina stă pe loc: prima mișcare de rotiță (sau tastă) în jos
 *    pornește asamblarea, care curge dintr-o bucată, ~1,3 s. Cât durează, rotița nu mișcă pagina; din clipa în care
 *    lădița arată gata, următorul clic derulează. Sus de tot, rotița în sus o desface la fel de lin.
 *  - Pe telefon, cu primul ecran fixat prin sticky, lădița urmează derularea (cu o întârziere lină).
 *  - Altfel, se asamblează cât urcă de la jumătatea ecranului până sub antet.
 * Scena 3D (three.js) se încarcă separat și apare lin, deja la poziția de început; fără WebGL rămâne o imagine.
 */
export function CrateAssembly() {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    let cleanup = () => {}
    let cancelled = false

    // fonturile întâi: până se încarcă, titlul își schimbă înălțimea și odată cu el cardul lădiței;
    // scena apare abia după, direct la mărimea și poziția ei de început (fără salt)
    const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))])
    import('./crateScene')
      .then(({ createCrateScene }) => Promise.all([createCrateScene(canvas), fontsReady]))
      .then(([scene]) => {
        if (cancelled) {
          scene.dispose()
          return
        }
        const still = window.matchMedia('(prefers-reduced-motion: reduce)')
        const atTop = () => window.scrollY <= 2

        // --- unde ține asamblarea: redare (calculator) sau derulare (telefon) ---
        let lock = false
        let start = 0
        let end = 1
        const measure = () => {
          lock = !!stage.closest('.hero[data-pin="lock"]')
          // ecran fixat: de când se oprește până puțin înainte să plece (la final lădița stă o clipă gata)
          const track = stage.closest<HTMLElement>('[data-pin-track]')
          if (track) {
            const css = getComputedStyle(track)
            const pinTop = parseFloat(css.getPropertyValue('--pin-top')) || 0
            const distance = parseFloat(css.getPropertyValue('--pin-distance')) || 0
            const naturalTop = track.getBoundingClientRect().top + window.scrollY + (parseFloat(css.paddingTop) || 0)
            start = naturalTop - pinTop
            end = start + Math.max(180, distance * 0.62)
            return
          }
          // fără fixare: de când lădița e pe jumătate în ecran până ajunge sub antet
          const rect = stage.getBoundingClientRect()
          const top = rect.top + window.scrollY
          const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
          start = Math.max(0, top + rect.height / 2 - window.innerHeight)
          end = Math.max(start + 240, top - header - 16)
        }
        const scrollTarget = () => (still.matches ? 1 : Math.min(1, Math.max(0, (window.scrollY - start) / (end - start))))

        // --- starea animației ---
        let current = 0
        let velocity = 0
        // modul lock: încotro merge (0 = desfăcută, 1 = gata) și redarea în curs
        let goal = 0
        let tween: { from: number; to: number; start: number; duration: number } | null = null
        let frame = 0
        let last = 0

        const tick = (now: number) => {
          const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
          last = now
          let moving: boolean
          if (lock || still.matches) {
            if (still.matches) {
              current = 1
              tween = null
            } else if (tween) {
              const t = Math.min(1, (now - tween.start) / tween.duration)
              current = tween.from + (tween.to - tween.from) * easeInOutSine(t)
              if (t >= 1) tween = null
            }
            velocity = 0
            moving = tween !== null
          } else {
            const target = scrollTarget()
            const next = smoothDamp(current, target, velocity, SMOOTH_TIME_SCROLL, dt)
            current = next.value
            velocity = next.velocity
            if (Math.abs(target - current) < 0.0005 && Math.abs(velocity) < 0.002) {
              current = target
              velocity = 0
            }
            moving = current !== target
          }
          scene.setProgress(current)
          scene.render()
          frame = moving ? requestAnimationFrame(tick) : 0
          if (!frame) last = 0
        }
        const wake = () => {
          if (!frame) frame = requestAnimationFrame(tick)
        }

        /** Pornește asamblarea (1) sau desfacerea (0) de unde a rămas; o schimbare de sens pornește lin. */
        const playTo = (to: number) => {
          if (goal === to && (tween || current === to)) return
          goal = to
          tween = { from: current, to, start: performance.now(), duration: PLAY_MS * Math.max(0.35, Math.abs(to - current)) }
          wake()
        }
        // „gata” când arată gata: capsele de la final nu mai țin pagina pe loc
        const assembled = () =>
          goal === 1 && (!tween || (performance.now() - tween.start) / tween.duration >= RELEASE_AT)

        // --- rotița (modul lock) ---
        let lastWheel = 0
        let lastStep = 0
        /** Folosește o mișcare de rotiță pentru lădiță; întoarce true dacă pagina nu trebuie să se miște. */
        const useWheel = (deltaY: number, e: WheelEvent) => {
          if (!lock || still.matches || e.ctrlKey || !atTop() || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return false
          const now = performance.now()
          const step = Math.abs(deltaY)
          const sameGesture = now - lastWheel < GESTURE_GAP && !(step >= MIN_NOTCH && step >= lastStep)
          lastWheel = now
          lastStep = step
          if (deltaY < 0) {
            // în sus, sus de tot: lădița se desface
            if (goal === 0) return tween !== null
            playTo(0)
            return true
          }
          // gata și e o mișcare nouă: pagina se derulează
          if (assembled() && !sameGesture) return false
          // altfel: asamblarea pornește (sau continuă); restul mișcării nu mișcă pagina
          playTo(1)
          return true
        }
        // cu derularea lină pornită, rotița trece întâi pe la lădiță; fără ea, ascultăm direct
        const onWheel = (e: WheelEvent) => {
          if (useWheel(e.deltaY, e)) e.preventDefault()
        }
        const smooth = isSmoothScrolling()
        const removeGate = smooth ? addWheelGate(useWheel) : () => {}

        // --- tastele (modul lock) ---
        const onKey = (e: KeyboardEvent) => {
          if (!lock || still.matches || !atTop() || e.altKey || e.ctrlKey || e.metaKey) return
          const el = e.target as HTMLElement | null
          if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
          // spațiul pe un buton sau link îl apasă, nu asamblează
          if (e.key === ' ' && el?.closest('button, a')) return
          const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)
          const up = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)
          if (down && !assembled()) {
            e.preventDefault()
            playTo(1)
          } else if (up && (goal > 0 || tween)) {
            e.preventDefault()
            playTo(0)
          }
        }

        // pagina a ajuns mai jos pe altă cale (bara de derulare, un link, Tab): lădița se asamblează singură
        const onScroll = () => {
          if (lock) {
            if (!atTop() && goal < 1) playTo(1)
            return
          }
          wake()
        }

        const resize = () => {
          const { width, height } = stage.getBoundingClientRect()
          scene.resize(Math.round(width), Math.round(height))
          measure()
          scene.setProgress(current)
          scene.render()
          wake()
        }
        const remeasure = () => {
          measure()
          wake()
        }

        const observer = new ResizeObserver(resize)
        observer.observe(stage)
        measure()
        // venit direct mai jos pe pagină (reîncărcare): lădița e deja gata
        if (!atTop() || still.matches) {
          goal = 1
          current = 1
        } else if (!lock) {
          current = scrollTarget()
        }
        resize()
        setStatus('ready')

        if (!smooth) window.addEventListener('wheel', onWheel, { passive: false })
        window.addEventListener('keydown', onKey)
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', measure)
        window.addEventListener(HERO_PIN_EVENT, remeasure)
        still.addEventListener('change', wake)
        cleanup = () => {
          cancelAnimationFrame(frame)
          observer.disconnect()
          window.removeEventListener('wheel', onWheel)
          removeGate()
          window.removeEventListener('keydown', onKey)
          window.removeEventListener('scroll', onScroll)
          window.removeEventListener('resize', measure)
          window.removeEventListener(HERO_PIN_EVENT, remeasure)
          still.removeEventListener('change', wake)
          scene.dispose()
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('failed')
      })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  return (
    <div
      ref={stageRef}
      className={`crate-stage is-${status}`}
      role="img"
      aria-label="Lădiță din lemn care se asamblează la derulare: trei scânduri de fund, patru traverse, două laterale, două capete și patru montanți de colț"
    >
      {status !== 'failed' && <canvas ref={canvasRef} />}
      {/* fără WebGL: imaginea randată dinainte (primul cadru al scenei) */}
      {status === 'failed' && (
        <img className="crate-poster" src={fallbackImage} width={1180} height={750} alt="" decoding="async" />
      )}
    </div>
  )
}

// Scena 3D din primul ecran: o lădiță din lemn care pornește desfăcută în elemente
// și se asamblează pe măsură ce pagina e derulată. Piesele vin din crateParts (cotele din config/crate.ts).
import { Group, MathUtils, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
import woodColor from '../../../assets/wood/wood-color.webp'
import woodNormal from '../../../assets/wood/wood-normal.webp'
import { createStudio, createWood, frameObjects, loadWoodMaps, POPLAR_TINT, viewDirection } from '../../../lib/woodStudio'
import { buildCrate, crateGeometries, steelMaterial } from './crateParts'
import type { CratePart, PartKind } from './crateParts'

const VIEW = viewDirection(-45, 34)
const FOV = 24
const TURN = MathUtils.degToRad(-11) // cât se rotește lădița în timpul asamblării
const STAPLE_POP = 0.025 // cât durează o capsă să intre în lemn (din progresul derulării)

/**
 * Ordinea asamblării, ca în atelier: traversele, fundul peste ele, montanții în colțuri, apoi
 * lateralele lungi și la urmă capetele, care le acoperă capetele. Pentru fiecare fel de piesă:
 * de unde pornește (în afara locului ei) și în ce parte a asamblării se mișcă. Fazele se suprapun,
 * ca mișcarea să curgă fără pauze; ultimele piese se așază pe la 0,9, apoi intră capsele.
 */
const timeline: Record<PartKind, { delay: number; span: number; from: (p: CratePart) => Vector3 }> = {
  cleat: { delay: 0, span: 0.34, from: (p) => new Vector3((p.index - 1.5) * 0.3, 0, 0) },
  slat: { delay: 0.1, span: 0.36, from: (p) => new Vector3(0, 0.4, (p.index - 1) * 0.32) },
  post: { delay: 0.3, span: 0.34, from: (p) => new Vector3(p.sx * 0.7, 0.45, p.sz * 0.55) },
  side: { delay: 0.46, span: 0.34, from: (p) => new Vector3(0, 0.22, p.sz * 0.75) },
  end: { delay: 0.56, span: 0.34, from: (p) => new Vector3(p.sx * 0.9, 0.22, 0) },
}

export interface CrateScene {
  resize(width: number, height: number): void
  /** 0 = elemente separate, 1 = lădiță asamblată. */
  setProgress(progress: number): void
  render(): void
  dispose(): void
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
/** Curbă blândă (început și final domoale), pentru mișcările de ansamblu: camera și rotirea. */
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

export async function createCrateScene(canvas: HTMLCanvasElement): Promise<CrateScene> {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const maps = await loadWoodMaps(renderer, { color: woodColor, normal: woodNormal }).catch((error: unknown) => {
    renderer.dispose()
    throw error
  })
  const scene = new Scene()
  const studio = createStudio(renderer, scene)
  const wood = createWood(renderer, maps, { tint: POPLAR_TINT })
  const geometries = crateGeometries()
  const steel = steelMaterial()
  const camera = new PerspectiveCamera(FOV, 1, 0.5, 200)
  const crate = new Group()
  scene.add(crate)

  const pieces = buildCrate(geometries, wood, steel).map((part) => {
    crate.add(part.mesh)
    const { delay, span, from } = timeline[part.kind]
    const to = part.mesh.position.clone()
    // capsele apar abia după ce piesa s-a așezat, una după alta, ca trase cu capsatorul
    const staples = part.staples.map((mesh, i, list) => ({ mesh, at: delay + span + 0.01 + (i * 0.06) / list.length }))
    return { mesh: part.mesh, to, from: to.clone().add(from(part)), delay, span, staples }
  })

  const meshes = pieces.map((p) => p.mesh)
  const sunOffset = studio.sun.position.clone()

  /** Așază piesele (și rotirea) pentru un anumit progres, fără să miște camera. */
  const place = (p: number) => {
    for (const { mesh, from, to, delay, span, staples } of pieces) {
      const t = MathUtils.clamp((p - delay) / span, 0, 1)
      // piesa vine întâi deasupra locului ei, apoi coboară, ca pusă cu mâna
      const across = easeInOut(Math.min(1, t / 0.65))
      const down = easeInOut(Math.max(0, (t - 0.35) / 0.65))
      mesh.position.set(
        MathUtils.lerp(from.x, to.x, across),
        MathUtils.lerp(from.y, to.y, down),
        MathUtils.lerp(from.z, to.z, across),
      )
      for (const staple of staples) {
        const k = MathUtils.clamp((p - staple.at) / STAPLE_POP, 0, 1)
        staple.mesh.visible = k > 0
        // intră în lemn: pornește puțin mai mare și se strânge la loc
        staple.mesh.scale.setScalar(1 + (1 - k) * 0.6)
      }
    }
    crate.rotation.y = TURN * (1 - smooth(p))
  }

  // Camera: încadrarea de la început (piesele desfăcute) și de la sfârșit (lădița gata), calculate o dată.
  // Între ele camera alunecă pe o singură curbă lină — nu se mai reîncadrează la fiecare cadru,
  // deci nu mai „pompează” și nu sare după piesele care se mișcă.
  const shot = { fromPos: new Vector3(), fromCenter: new Vector3(), toPos: new Vector3(), toCenter: new Vector3() }
  const center = new Vector3()
  const frame = () => {
    place(0)
    shot.fromCenter.copy(frameObjects(camera, meshes, VIEW, 0.86))
    shot.fromPos.copy(camera.position)
    place(1)
    shot.toCenter.copy(frameObjects(camera, meshes, VIEW, 0.84))
    shot.toPos.copy(camera.position)
  }

  let progress = 0
  const setProgress = (value: number) => {
    progress = MathUtils.clamp(value, 0, 1)
    place(progress)
    const k = smooth(progress)
    center.lerpVectors(shot.fromCenter, shot.toCenter, k)
    camera.position.lerpVectors(shot.fromPos, shot.toPos, k)
    camera.lookAt(center)
    studio.sun.target.position.copy(center)
    studio.sun.position.copy(center).add(sunOffset)
  }

  return {
    resize(width, height) {
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
      frame()
      setProgress(progress)
    },
    setProgress,
    render() {
      renderer.render(scene, camera)
    },
    dispose() {
      geometries.dispose()
      steel.dispose()
      wood.dispose()
      Object.values(maps).forEach((t) => t?.dispose())
      studio.dispose()
      renderer.dispose()
    },
  }
}

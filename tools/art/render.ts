// Randează imaginile fotorealiste ale site-ului: ilustrațiile din „De ce să lucrați cu noi” și
// fotografiile produselor din catalog.
// Rulare: serverul Vite pornit (npx vite --port 5173), apoi `node tools/art/capture.mjs`.
// Fiecare imagine e media mai multor cadre: camera se mișcă sub un pixel (margini fine), soarele
// într-un disc mic (umbre moi), iar o a doua lumină ia direcții la întâmplare pe cer (umbră de contact).
// Rezultatul e pus în window.__art: imagini WebP și punctele pe care se desenează cotele.
import {
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Material } from 'three'
import { buildCrate, crateGeometries, steelMaterial } from '../../src/components/site/crate/crateParts'
import type { CratePart, PartKind } from '../../src/components/site/crate/crateParts'
import {
  createStudio,
  createWood,
  frameObjects,
  loadWoodMaps,
  POPLAR_TINT,
  seeded,
  setupWoodTexture,
  viewDirection,
  woodUVs,
} from '../../src/lib/woodStudio'
import type { WoodMaps } from '../../src/lib/woodStudio'

const W = 1080
const H = 630
const VIEW_W = 240 // viewBox-ul ilustrațiilor din site
const VIEW_H = 140
const params = new URLSearchParams(location.search)
const SAMPLES = Number(params.get('samples') ?? 36)
const WOOD_TINT = params.get('tint') ?? POPLAR_TINT
const ONLY = params.get('only')?.split(',')
// Corecția texturii Wood022 spre plopul lădițelor: culoarea medie (sRGB), cât contrast rămâne
// fibrei și cât rămâne din variațiile de nuanță. Se pot încerca din adresă: ?target=230,209,172&kl=1.3&kc=0.65
const TARGET = (params.get('target') ?? '230,209,172').split(',').map(Number)
const KEEP_GRAIN = Number(params.get('kl') ?? 1.3)
const KEEP_HUE = Number(params.get('kc') ?? 0.65)

const renderer = new WebGLRenderer({ antialias: false, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(W, H, false)
renderer.setClearColor(0xffffff, 1)
document.body.append(renderer.domElement)
const status = document.getElementById('status') as HTMLElement

const textureUrls = (id: string, res = '2k') => ({
  color: `/tools/art/textures/${id}-color-${res}.jpg`,
  normal: `/tools/art/textures/${id}-normal-${res}.jpg`,
  roughness: `/tools/art/textures/${id}-rough-${res}.jpg`,
})
let crateMaps: WoodMaps
let palletMaps: WoodMaps
let poplarCanvas: HTMLCanvasElement
const crateWood = (seed: number) => createWood(renderer, crateMaps, { tint: WOOD_TINT, seed })

async function loadImage(url: string) {
  const image = new Image()
  image.src = url
  await image.decode()
  return image
}

/**
 * Wood022 (ambientCG, CC0) adus spre plopul lădițelor: media culorii devine crem deschis, fibra își
 * păstrează contrastul (KEEP_GRAIN), iar variațiile de nuanță se sting (KEEP_HUE), ca lemnul să nu mai
 * tragă spre galben. Structura fibrei și relieful rămân cele scanate.
 */
async function poplarColor(size = 2048) {
  const image = await loadImage('/tools/art/textures/wood022-color-2k.jpg')
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  ctx.drawImage(image, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size)
  const px = data.data
  const mean = [0, 0, 0]
  for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) mean[c] += px[i + c]
  for (let c = 0; c < 3; c++) mean[c] /= px.length / 4
  const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b
  const meanL = lum(mean[0], mean[1], mean[2])
  for (let i = 0; i < px.length; i += 4) {
    const dl = lum(px[i], px[i + 1], px[i + 2]) - meanL
    for (let c = 0; c < 3; c++) {
      const hue = px[i + c] - mean[c] - dl
      px[i + c] = Math.max(0, Math.min(255, TARGET[c] + dl * KEEP_GRAIN + hue * KEEP_HUE))
    }
  }
  ctx.putImageData(data, 0, 0)
  return canvas
}

async function poplarMaps(): Promise<WoodMaps> {
  poplarCanvas = await poplarColor()
  const loader = new TextureLoader()
  const [normal, roughness] = await Promise.all([
    loader.loadAsync('/tools/art/textures/wood022-normal-2k.jpg'),
    loader.loadAsync('/tools/art/textures/wood022-rough-2k.jpg'),
  ])
  return {
    color: setupWoodTexture(new CanvasTexture(poplarCanvas), renderer, true),
    normal: setupWoodTexture(normal, renderer),
    roughness: setupWoodTexture(roughness, renderer),
  }
}

interface Shot {
  scene: Scene
  camera: PerspectiveCamera
  sun: DirectionalLight
  sky: DirectionalLight
  target: Vector3
  /** deplasarea cadrului, în pixeli (pozitiv = obiectul urcă / se mută la stânga) */
  shift: [number, number]
}

function setupScene(extent: number) {
  const scene = new Scene()
  const studio = createStudio(renderer, scene, extent)
  scene.environmentIntensity = 0.42
  studio.sun.intensity = 1.55
  studio.sun.shadow.mapSize.set(4096, 4096)
  studio.sun.shadow.radius = 2
  studio.sun.shadow.bias = -0.0002
  studio.sun.shadow.normalBias = 0.012
  // media cadrelor diluează umbra; pe podea o vrem vizibilă, ca obiectul să stea pe ceva
  ;(studio.ground.material as ShadowMaterial).opacity = 0.4

  const sky = new DirectionalLight(0xffffff, 1.15)
  sky.castShadow = true
  sky.shadow.mapSize.set(2048, 2048)
  Object.assign(sky.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 0.5, far: 80 })
  sky.shadow.bias = -0.0003
  sky.shadow.normalBias = 0.012
  sky.shadow.radius = 2
  scene.add(sky, sky.target)

  const camera = new PerspectiveCamera(22, W / H, 0.1, 200)
  return { scene, studio, sky, camera }
}

const nextFrame = () => new Promise((r) => setTimeout(r, 0))

async function shoot({ scene, camera, sun, sky, target, shift }: Shot) {
  const rnd = seeded(4242)
  const gl = renderer.getContext()
  const sum = new Float32Array(W * H * 4)
  const px = new Uint8Array(W * H * 4)
  const sunBase = sun.position.clone().sub(target)
  sun.target.position.copy(target)
  sky.target.position.copy(target)

  for (let i = 0; i < SAMPLES; i++) {
    camera.setViewOffset(W, H, shift[0] + rnd() - 0.5, shift[1] + rnd() - 0.5, W, H)
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd()) * 0.9
    sun.position.copy(target).add(sunBase).add(new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
    // direcție pe cer, mai des spre zenit (distribuție cosinus)
    const phi = rnd() * Math.PI * 2
    const cos = Math.sqrt(1 - rnd() * 0.92)
    const sin = Math.sqrt(1 - cos * cos)
    sky.position.copy(target).add(new Vector3(Math.cos(phi) * sin, cos, Math.sin(phi) * sin).multiplyScalar(30))

    renderer.render(scene, camera)
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px)
    for (let k = 0; k < px.length; k++) sum[k] += px[k]
    if (i % 4 === 3) await nextFrame()
  }

  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const ctx = out.getContext('2d') as CanvasRenderingContext2D
  const image = ctx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const src = ((H - 1 - y) * W + x) * 4
      const dst = (y * W + x) * 4
      for (let c = 0; c < 3; c++) image.data[dst + c] = Math.round(sum[src + c] / SAMPLES)
      image.data[dst + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  document.body.append(out)
  return out.toDataURL('image/webp', 0.86)
}

/** Proiectează un punct 3D în coordonatele viewBox-ului 240 × 140. */
function project(shot: Shot, point: Vector3) {
  shot.camera.setViewOffset(W, H, shot.shift[0], shot.shift[1], W, H)
  shot.camera.updateMatrixWorld()
  const v = point.clone().project(shot.camera)
  const round = (n: number) => Math.round(n * 10) / 10
  return [round(((v.x + 1) / 2) * VIEW_W), round(((1 - v.y) / 2) * VIEW_H)] as const
}

function add(scene: Scene, mesh: Mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

/** Scândură cu lungimea pe X; UV-urile în metri, fibra de-a lungul ei. */
const boardGeometry = (length: number, height: number, width: number) =>
  woodUVs(new BoxGeometry(length, height, width))

// ---------- Avantaje ----------

/** Scândură cu cote: 500 × 100 × 15 mm, pe cant. */
async function board() {
  const { scene, studio, sky, camera } = setupScene(5)
  const wood = crateWood(11)
  const mesh = add(scene, new Mesh(boardGeometry(5, 1, 0.15), wood.boardFaces()))
  mesh.position.y = 0.5
  const target = frameObjects(camera, [mesh], viewDirection(28, 23), 0.72)
  const shot: Shot = { scene, camera, sun: studio.sun, sky, target, shift: [-14, 30] }
  const points = {
    bottomLeft: project(shot, new Vector3(-2.5, 0, 0.075)),
    bottomRight: project(shot, new Vector3(2.5, 0, 0.075)),
    topLeft: project(shot, new Vector3(-2.5, 1, 0.075)),
    endFront: project(shot, new Vector3(2.5, 0.62, 0.075)),
    endBack: project(shot, new Vector3(2.5, 0.62, -0.075)),
  }
  return { images: { board: await shoot(shot) }, points }
}

function stampTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1100
  canvas.height = 500
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const ink = document.createElement('canvas')
  ink.width = canvas.width
  ink.height = canvas.height
  const c = ink.getContext('2d') as CanvasRenderingContext2D
  c.strokeStyle = c.fillStyle = 'rgb(42, 24, 12)'
  c.lineWidth = 22
  c.beginPath()
  c.roundRect(24, 24, 1052, 452, 30)
  c.stroke()
  c.beginPath()
  c.moveTo(390, 24)
  c.lineTo(390, 476)
  c.moveTo(390, 250)
  c.lineTo(1076, 250)
  c.stroke()
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.font = 'bold 96px Arial, sans-serif'
  c.fillText('ISPM', 207, 160)
  c.font = 'bold 190px Arial, sans-serif'
  c.fillText('15', 207, 345)
  c.font = 'bold 128px Arial, sans-serif'
  c.fillText('RO-000', 733, 142)
  c.font = 'bold 158px Arial, sans-serif'
  c.fillText('HT', 733, 368)

  // ștampila nu se prinde uniform: pete lipsă și dâre de-a lungul fibrei
  const rnd = seeded(15)
  c.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 900; i++) {
    c.globalAlpha = 0.3 + rnd() * 0.7
    c.beginPath()
    c.arc(rnd() * 1100, rnd() * 500, 1 + rnd() * 5, 0, Math.PI * 2)
    c.fill()
  }
  for (let i = 0; i < 26; i++) {
    c.globalAlpha = 0.15 + rnd() * 0.3
    c.fillRect(rnd() * 1100, rnd() * 500, 80 + rnd() * 400, 2 + rnd() * 5)
  }
  ctx.filter = 'blur(1.4px)'
  ctx.globalAlpha = 0.9
  ctx.drawImage(ink, 0, 0)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** Grindă cu marcajul ISPM 15. */
async function ispm() {
  const { scene, studio, sky, camera } = setupScene(5)
  const wood = crateWood(23)
  const beam = add(scene, new Mesh(boardGeometry(4.2, 1.5, 1), wood.boardFaces()))
  beam.position.y = 0.75

  const stamp = new Mesh(
    new PlaneGeometry(2.3, 1.05),
    new MeshStandardMaterial({
      map: stampTexture(),
      transparent: true,
      roughness: 0.9,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    }),
  )
  stamp.position.set(0.05, 0.76, 0.502)
  stamp.rotation.z = -0.035
  stamp.receiveShadow = true
  scene.add(stamp)

  const target = frameObjects(camera, [beam], viewDirection(24, 19), 0.72)
  const shot: Shot = { scene, camera, sun: studio.sun, sky, target, shift: [22, 10] }
  stamp.visible = false
  const plain = await shoot(shot)
  stamp.visible = true
  const stamped = await shoot(shot)
  return { images: { ispm: plain, 'ispm-stamped': stamped } }
}

/** Palet EUR 1200 × 800 cu scânduri de 400 × 100 × 10 și două benzi. */
async function pallet() {
  const { scene, studio, sky, camera } = setupScene(10)
  const palletWood = createWood(renderer, palletMaps, { tint: '#e8cfa6', seed: 31 })
  const loadWood = crateWood(37)
  const part = (length: number, height: number, width: number, x: number, y: number, z: number, across = false) => {
    const mesh = add(scene, new Mesh(boardGeometry(length, height, width), palletWood.boardFaces(0.92)))
    mesh.position.set(x, y, z)
    if (across) mesh.rotation.y = Math.PI / 2
  }
  // talpă: 3 scânduri pe lungime; 9 calupuri; 3 traverse pe lățime; punte: 5 scânduri
  const rowsZ = [-3.5, 0, 3.5]
  const colsX = [-5.275, 0, 5.275]
  rowsZ.forEach((z, i) => part(12, 0.22, i === 1 ? 1.45 : 1, 0, 0.11, z))
  for (const x of colsX) for (const [i, z] of rowsZ.entries()) part(1.45, 0.78, i === 1 ? 1.45 : 1, x, 0.61, z)
  for (const x of colsX) part(8, 0.22, 1.45, x, 1.11, 0, true)
  const deck = [1.45, 1, 1.45, 1, 1.45]
  const gap = (8 - deck.reduce((a, b) => a + b, 0)) / 4
  let z = -4
  for (const w of deck) {
    part(12, 0.22, w, 0, 1.33, z + w / 2)
    z += w + gap
  }

  // încărcătura: 40 de rânduri, fiecare cu 3 × 8 scânduri; câteva variante de material, puse la întâmplare
  const LAYERS = 40
  const variants = Array.from({ length: 6 }, () => loadWood.boardFaces(1))
  const geometry = boardGeometry(3.96, 0.1, 0.98)
  const rnd = seeded(99)
  const slots: Matrix4[][] = variants.map(() => [])
  const q = new Quaternion()
  const up = new Vector3(0, 1, 0)
  for (let layer = 0; layer < LAYERS; layer++) {
    for (const x of [-4, 0, 4]) {
      for (let i = 0; i < 8; i++) {
        q.setFromAxisAngle(up, (rnd() - 0.5) * 0.006)
        const m = new Matrix4().compose(
          new Vector3(x + (rnd() - 0.5) * 0.036, 1.44 + 0.05 + layer * 0.1, -3.5 + i + (rnd() - 0.5) * 0.018),
          q,
          new Vector3(1, 1, 1),
        )
        slots[Math.floor(rnd() * variants.length)].push(m)
      }
    }
  }
  variants.forEach((materials: Material[], v) => {
    const mesh = new InstancedMesh(geometry, materials, slots[v].length)
    slots[v].forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
  })

  // benzile de ambalare, peste stivă și pe laturile lungi
  const top = 1.44 + LAYERS * 0.1
  const strapMaterial = new MeshStandardMaterial({ color: 0xf2a93b, roughness: 0.42 })
  const straps: Mesh[] = []
  for (const x of [-3.2, 3.2]) {
    const pieces = [
      new Mesh(new BoxGeometry(0.16, 0.014, 8.08), strapMaterial),
      new Mesh(new BoxGeometry(0.16, top - 1.44 + 0.014, 0.014), strapMaterial),
      new Mesh(new BoxGeometry(0.16, top - 1.44 + 0.014, 0.014), strapMaterial),
    ]
    pieces[0].position.set(x, top + 0.007, 0)
    pieces[1].position.set(x, (top + 1.44) / 2 + 0.007, 4.033)
    pieces[2].position.set(x, (top + 1.44) / 2 + 0.007, -4.033)
    pieces.forEach((p) => add(scene, p))
    straps.push(...pieces)
  }

  // pentru încadrare ajunge un corp cu dimensiunile totale
  const bounds = new Mesh(new BoxGeometry(12, top, 8))
  bounds.position.y = top / 2
  const target = frameObjects(camera, [bounds], viewDirection(-36, 22), 0.84)
  const shot: Shot = { scene, camera, sun: studio.sun, sky, target, shift: [0, 8] }
  straps.forEach((s) => (s.visible = false))
  const plain = await shoot(shot)
  straps.forEach((s) => (s.visible = true))
  const strapped = await shoot(shot)
  return { images: { pallet: plain, 'pallet-strapped': strapped } }
}

// ---------- Produse din catalog: elementele lăditei din primul ecran ----------

const geometries = crateGeometries()

/** Fotografie de produs: privit de sus-stânga, cu loc jos-stânga pentru eticheta cu dimensiunile. */
function productShot(setup: ReturnType<typeof setupScene>, meshes: Mesh[], azimuth = -32, elevation = 30, margin = 0.74) {
  const target = frameObjects(setup.camera, meshes, viewDirection(azimuth, elevation), margin)
  return { scene: setup.scene, camera: setup.camera, sun: setup.studio.sun, sky: setup.sky, target, shift: [-56, 66] } as Shot
}

const clay = new MeshStandardMaterial({ color: 0xe1dfdb, roughness: 0.92 })

/**
 * Elementul în lădița lui: lădița în „lut” alb mat, iar piesele de felul vândut, în lemn, scoase puțin
 * din locul lor. Se vede dintr-o privire ce piesă e și unde se montează.
 */
async function inCrate(kind: PartKind, pull: (part: CratePart) => Vector3, seed: number) {
  const setup = setupScene(7)
  const parts = buildCrate(geometries, crateWood(seed), steelMaterial())
  for (const part of parts) {
    part.staples.forEach((s) => (s.visible = false))
    if (part.kind === kind) part.mesh.position.add(pull(part))
    else part.mesh.material = clay
    setup.scene.add(part.mesh)
  }
  return shoot(productShot(setup, parts.map((p) => p.mesh), -40, 30, 0.8))
}

/** Setul: lădița montată, identică cu cea din primul ecran, cu capse. */
async function crateSet() {
  const setup = setupScene(6)
  const parts = buildCrate(geometries, crateWood(106), steelMaterial())
  parts.forEach((p) => setup.scene.add(p.mesh))
  return shoot(productShot(setup, parts.map((p) => p.mesh), -40, 32, 0.8))
}

async function products() {
  return {
    images: {
      laterala: await inCrate('side', (p) => new Vector3(0, 0.3, p.sz * 0.9), 101),
      capat: await inCrate('end', (p) => new Vector3(p.sx * 1.1, 0.3, 0), 102),
      fund: await inCrate('slat', () => new Vector3(0, 1.1, 0), 103),
      traversa: await inCrate('cleat', () => new Vector3(0, 0, 2.3), 104),
      montant: await inCrate('post', () => new Vector3(0, 0.9, 0), 105),
      'set-lada': await crateSet(),
    },
  }
}

// ---------- Texturi pentru lădița din primul ecran ----------

/** Micșorează o textură și o întoarce ca WebP, pentru încărcarea în pagină. */
function webp(image: CanvasImageSource, size: number, quality: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, size, size)
  return canvas.toDataURL('image/webp', quality)
}

async function main() {
  const t0 = performance.now()
  crateMaps = await poplarMaps()
  palletMaps = await loadWoodMaps(renderer, textureUrls('bamboo_veneer'))
  const jobs: [string, () => Promise<{ images: Record<string, string>; points?: unknown }>][] = [
    ['Scândura', board],
    ['Ștampila', ispm],
    ['Paletul', pallet],
    ['Produsele', products],
  ]
  const images: Record<string, string> = {}
  let points: unknown = null
  for (const [label, job] of jobs) {
    if (ONLY && !ONLY.includes(label.toLowerCase())) continue
    status.textContent = `${label}…`
    const result = await job()
    Object.assign(images, result.images)
    if (result.points) points = result.points
  }
  const wood = {
    color: webp(poplarCanvas, 1024, 0.84),
    normal: webp(await loadImage('/tools/art/textures/wood022-normal-2k.jpg'), 1024, 0.78),
  }
  const art = { images, points: points ? { board: points } : null, wood }
  ;(window as unknown as { __art: typeof art }).__art = art
  status.textContent = `Gata în ${Math.round((performance.now() - t0) / 1000)} s`
}

main().catch((e: unknown) => {
  status.textContent = String(e)
  ;(window as unknown as { __artError: string }).__artError = String(e)
})

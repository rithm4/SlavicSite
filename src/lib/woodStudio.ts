// Lemnul și lumina scenelor 3D: texturi scanate de lemn (Poly Haven, licență CC0), materialele
// scândurilor și „studioul” (mediu de lumină, soare cu umbră, podea care primește doar umbra).
// Folosit de lădița din primul ecran și de randarea ilustrațiilor (tools/art).
// Unități în scenă: 1 = 100 mm.
import {
  BufferAttribute,
  CanvasTexture,
  Color,
  DirectionalLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  ShadowMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three'
import type {
  BufferGeometry,
  ColorRepresentation,
  Material,
  PerspectiveCamera,
  Scene,
  Texture,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const UNITS_PER_METER = 10

/** Nuanța finală a lemnului; textura e deja corectată spre plopul crem al lădițelor (tools/art). */
export const POPLAR_TINT = '#ffffff'

/** Cât acoperă o placă de textură, în metri: fibra scanată are mărimea fibrei de plop. */
export const WOOD_TILE = 0.6

/** Generator determinist, ca variațiile să arate la fel la fiecare încărcare. */
export function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- Texturi ----------

export interface WoodMapUrls {
  color: string
  normal: string
  roughness?: string
}

/** Textura scanată, cu fibra pe orizontală (pe U); o placă acoperă WOOD_TILE metri. */
export interface WoodMaps {
  color: Texture
  normal: Texture
  roughness?: Texture
}

/** Repetare, filtrare și scară pentru o hartă de lemn (culoare, relief sau rugozitate). */
export function setupWoodTexture<T extends Texture>(t: T, renderer: WebGLRenderer, isColor = false): T {
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  t.repeat.set(1 / WOOD_TILE, 1 / WOOD_TILE)
  if (isColor) t.colorSpace = SRGBColorSpace
  return t
}

export async function loadWoodMaps(renderer: WebGLRenderer, urls: WoodMapUrls): Promise<WoodMaps> {
  const loader = new TextureLoader()
  const load = async (url: string, isColor = false) => setupWoodTexture(await loader.loadAsync(url), renderer, isColor)
  const [color, normal, roughness] = await Promise.all([
    load(urls.color, true),
    load(urls.normal),
    urls.roughness ? load(urls.roughness) : undefined,
  ])
  return { color, normal, roughness }
}

type Axis = 0 | 1 | 2

/**
 * Coordonate de textură în metri, proiectate pe fiecare față după normala ei, ca textura să aibă
 * mărimea reală pe orice piesă. Fibra (U) curge de-a lungul axei `along` a piesei; pe capete
 * (fețele perpendiculare pe `along`) rămân celelalte două axe.
 */
export function woodUVs<T extends BufferGeometry>(geometry: T, along: Axis = 0): T {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const uv = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) {
    const n = [Math.abs(normal.getX(i)), Math.abs(normal.getY(i)), Math.abs(normal.getZ(i))]
    const facing = n[0] >= n[1] && n[0] >= n[2] ? 0 : n[1] >= n[2] ? 1 : 2
    const p = [position.getX(i), position.getY(i), position.getZ(i)]
    let u: number
    let v: number
    if (facing === along) {
      // pe capete, înălțimea (Y) rămâne pe V, ca straturile placajului să stea orizontal pe toate marginile
      const others = [0, 1, 2].filter((k) => k !== along)
      const [a, b] = others.includes(1) ? [others.find((k) => k !== 1) as number, 1] : others
      ;[u, v] = [p[a], p[b]]
    } else {
      ;[u, v] = [p[along], p[3 - along - facing]]
    }
    uv[i * 2] = u / UNITS_PER_METER
    uv[i * 2 + 1] = v / UNITS_PER_METER
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  return geometry
}

function canvas2d(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponibil')
  return { canvas, ctx }
}

/**
 * Capătul tăiat al lemnului, la scară: o placă de 125 × 125 mm cu inele anuale la ~4 mm,
 * raze medulare și pori. Culoarea finală vine din nuanța materialului.
 */
function paintEndGrain(rnd: () => number) {
  const size = 512
  const { canvas, ctx } = canvas2d(size, size)
  // plopul are inelele abia vizibile și capătul doar puțin mai închis decât fața
  ctx.fillStyle = '#dcc9a6'
  ctx.fillRect(0, 0, size, size)
  const cx = -size * 0.6
  const cy = size * 1.7
  for (let r = 40; r < size * 3; r += 13 + rnd() * 6) {
    // lemnul târziu: o linie mai închisă, lemnul timpuriu: o bandă deschisă după ea
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.lineWidth = 2 + rnd() * 2.5
    ctx.strokeStyle = `rgba(150, 112, 70, ${0.12 + rnd() * 0.12})`
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
    ctx.lineWidth = 4
    ctx.strokeStyle = `rgba(255, 240, 215, ${0.08 + rnd() * 0.08})`
    ctx.stroke()
  }
  for (let i = 0; i < 90; i++) {
    const a = -0.9 + rnd() * 0.8
    const r0 = size * (1.2 + rnd())
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
    ctx.lineTo(cx + Math.cos(a) * (r0 + 30 + rnd() * 80), cy + Math.sin(a) * (r0 + 30 + rnd() * 80))
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(245, 225, 195, 0.35)'
    ctx.stroke()
  }
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(110, 72, 40, ${0.05 + rnd() * 0.12})`
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd(), 1 + rnd())
  }
  return canvas
}

/** Marginea placajului: trei straturi de 1,3 mm, cel din mijloc cu fibra pe cruce, lipite între ele. */
function paintPlies(rnd: () => number) {
  const width = 512
  const height = 96
  const { canvas, ctx } = canvas2d(width, height)
  const ply = height / 3
  const tones = ['#e2cda9', '#cfb48b', '#e2cda9']
  tones.forEach((tone, i) => {
    ctx.fillStyle = tone
    ctx.fillRect(0, i * ply, width, ply)
  })
  // stratul din mijloc e tăiat transversal: pori scurți, pe verticală
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(120, 82, 46, ${0.1 + rnd() * 0.2})`
    ctx.fillRect(rnd() * width, ply + rnd() * ply, 1, 2 + rnd() * 5)
  }
  // straturile exterioare: fibră lungă
  for (let i = 0; i < 90; i++) {
    const y = (rnd() > 0.5 ? 0 : 2 * ply) + rnd() * ply
    ctx.fillStyle = `rgba(150, 110, 70, ${0.06 + rnd() * 0.1})`
    ctx.fillRect(0, y, width, 1)
  }
  ctx.fillStyle = 'rgba(95, 64, 36, 0.55)'
  ctx.fillRect(0, ply - 1.5, width, 3)
  ctx.fillRect(0, 2 * ply - 1.5, width, 3)
  return canvas
}

// ---------- Materiale ----------

export interface WoodOptions {
  /** Nuanța care înmulțește culoarea texturii (ex. crem cald pentru plop). */
  tint?: ColorRepresentation
  seed?: number
}

export interface Wood {
  /** Lemn pe toate fețele; geometria are nevoie de woodUVs. */
  board(shade?: number): MeshStandardMaterial
  /** Capăt tăiat, cu inele. */
  end(shade?: number): MeshStandardMaterial
  /** Pentru BoxGeometry cu lungimea pe X: capetele (±X) cu inele, restul cu fibră. */
  boardFaces(shade?: number): Material[]
  /** Pentru BoxGeometry de placaj culcat (grosimea pe Y, centrat): marginile arată straturile. */
  plywoodFaces(): Material[]
  /** Pentru ExtrudeGeometry: capacele cu inele, apoi lateralele. */
  post(): Material[]
  dispose(): void
}

export function createWood(renderer: WebGLRenderer, maps: WoodMaps, options: WoodOptions = {}): Wood {
  const rnd = seeded(options.seed ?? 20260930)
  const tint = new Color(options.tint ?? 0xffffff)
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const textures: Texture[] = []
  const materials: Material[] = []
  const keep = <T extends Material>(material: T) => {
    materials.push(material)
    return material
  }
  const canvasTexture = (source: HTMLCanvasElement) => {
    const t = new CanvasTexture(source)
    t.colorSpace = SRGBColorSpace
    t.wrapS = RepeatWrapping
    t.wrapT = RepeatWrapping
    t.anisotropy = anisotropy
    textures.push(t)
    return t
  }
  const endGrain = canvasTexture(paintEndGrain(rnd))
  const plies = canvasTexture(paintPlies(rnd))
  // fiecare piesă are altă nuanță, ca lemnul adevărat: unele scânduri mai albe, altele mai gălbui
  const warm = new Color(1, 0.93, 0.8)
  const shadeOf = (shade: number) =>
    tint
      .clone()
      .lerp(warm, rnd() * 0.3)
      .multiplyScalar(shade * (0.92 + rnd() * 0.12))

  const board = (shade = 1) => {
    const offsetX = rnd()
    const offsetY = rnd()
    const place = (source: Texture) => {
      const t = source.clone()
      t.offset.set(offsetX, offsetY)
      textures.push(t)
      return t
    }
    return keep(
      new MeshStandardMaterial({
        map: place(maps.color),
        normalMap: place(maps.normal),
        // relieful fibrei puțin mai adânc decât în scanare, ca lumina să-l prindă,
        // și un luciu satinat discret, ca la lemnul geluit
        normalScale: new Vector2(1.8, 1.8),
        roughnessMap: maps.roughness ? place(maps.roughness) : null,
        roughness: maps.roughness ? 0.86 : 0.7,
        color: shadeOf(shade),
      }),
    )
  }

  const end = (shade = 1) => {
    const t = endGrain.clone()
    t.repeat.set(8, 8)
    t.offset.set(rnd(), rnd())
    textures.push(t)
    return keep(new MeshStandardMaterial({ map: t, color: shadeOf(shade), roughness: 0.9 }))
  }

  return {
    board,
    end,
    boardFaces(shade = 1) {
      const e = end(shade)
      const side = board(shade)
      return [e, e, side, side, side, side]
    },
    plywoodFaces() {
      const t = plies.clone()
      // 4 mm de placaj = o placă de textură pe grosime; geometria e centrată, deci pornim de la jumătate
      t.repeat.set(5, 250)
      t.offset.set(rnd(), 0.5)
      textures.push(t)
      const edge = keep(new MeshStandardMaterial({ map: t, color: shadeOf(1), roughness: 0.85 }))
      const face = board(1)
      return [edge, edge, face, face, edge, edge]
    },
    post() {
      return [end(1), board(1)]
    },
    dispose() {
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
    },
  }
}

// ---------- Cameră și lumină ----------

/** Direcția dinspre obiect spre cameră, din azimut și înălțime (în grade). */
export function viewDirection(azimuth: number, elevation: number) {
  const a = MathUtils.degToRad(azimuth)
  const e = MathUtils.degToRad(elevation)
  return new Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e))
}

const corner = new Vector3()

/**
 * Așază camera pe direcția `back` cât de aproape se poate, cu toate obiectele în cadru.
 * `margin` < 1 lasă aer în jur. Întoarce punctul spre care privește camera.
 */
export function frameObjects(camera: PerspectiveCamera, meshes: Mesh[], back: Vector3, margin = 0.9) {
  const right = new Vector3().crossVectors(back.clone().negate(), new Vector3(0, 1, 0)).normalize()
  const up = new Vector3().crossVectors(right, back.clone().negate())
  const coords: number[][] = []
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false)
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox
    if (!box) continue
    for (let i = 0; i < 8; i++) {
      corner
        .set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
        .applyMatrix4(mesh.matrixWorld)
      coords.push([corner.dot(right), corner.dot(up), corner.dot(back)])
    }
  }
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const c of coords) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], c[k])
      max[k] = Math.max(max[k], c[k])
    }
  }
  const mid = min.map((v, k) => (v + max[k]) / 2)
  const center = right.clone().multiplyScalar(mid[0]).addScaledVector(up, mid[1]).addScaledVector(back, mid[2])

  const tanV = Math.tan(MathUtils.degToRad(camera.fov / 2)) * margin
  const tanH = tanV * camera.aspect
  let distance = 0
  for (const [x, y, z] of coords) {
    const dz = z - mid[2]
    distance = Math.max(distance, dz + Math.abs(x - mid[0]) / tanH, dz + Math.abs(y - mid[1]) / tanV)
  }
  camera.position.copy(center).addScaledVector(back, distance)
  camera.lookAt(center)
  return center
}

export interface Studio {
  sun: DirectionalLight
  ground: Mesh
  dispose(): void
}

/** Lumina de studio: mediu moale, un soare cald din stânga-sus și umbra pe o podea invizibilă. */
export function createStudio(renderer: WebGLRenderer, scene: Scene, extent = 8): Studio {
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap

  const pmrem = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const envMap = pmrem.fromScene(room, 0.04).texture
  room.dispose()
  scene.environment = envMap
  scene.environmentIntensity = 0.75

  const sun = new DirectionalLight(0xfff3e4, 1.8)
  sun.position.set(-4, 10, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -extent
  sun.shadow.camera.right = extent
  sun.shadow.camera.top = extent
  sun.shadow.camera.bottom = -extent
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 40
  sun.shadow.bias = -0.001
  sun.shadow.normalBias = 0.045
  sun.shadow.radius = 4
  scene.add(sun, sun.target)

  const groundMaterial = new ShadowMaterial({ color: 0x3a2814, opacity: 0.16 })
  const ground = new Mesh(new PlaneGeometry(80, 80), groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  return {
    sun,
    ground,
    dispose() {
      ground.geometry.dispose()
      groundMaterial.dispose()
      envMap.dispose()
      pmrem.dispose()
    },
  }
}

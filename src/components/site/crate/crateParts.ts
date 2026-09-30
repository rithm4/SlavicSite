// Piesele lăditei în 3D, construite din cotele din config/crate.ts.
// Le folosesc lădița care se asamblează în primul ecran și fotografiile produselor (tools/art),
// ca elementele din catalog să fie exact cele din lădiță.
// Unități: 1 = 100 mm. X = lungimea lăditei, Z = lățimea, Y = înălțimea; Y = 0 e podeaua.
import { BoxGeometry, ExtrudeGeometry, Mesh, MeshStandardMaterial, Shape } from 'three'
import type { BufferGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { crate, crateElements } from '../../../config/crate'
import { woodUVs } from '../../../lib/woodStudio'
import type { Wood } from '../../../lib/woodStudio'

const MM = 0.01
const EDGE = 0.01 // rotunjirea muchiilor: 1 mm

export const LENGTH = crate.length * MM
export const WIDTH = crate.width * MM
const WALL = crate.wall.thickness * MM
const WALL_H = crate.wall.height * MM
const CLEAT_H = crate.cleat.height * MM
const SLAT_T = crate.slat.thickness * MM
const SLAT_W = crate.slat.width * MM
const LEG = crate.post.leg * MM
const INNER_W = WIDTH - 2 * WALL
const SLAT_GAP = (INNER_W - crate.slat.count * SLAT_W) / (crate.slat.count - 1)
const CLEATS_X = crate.cleat.centers.map((x) => x * MM)
/** fața de sus a fundului */
export const FLOOR = CLEAT_H + SLAT_T

export type PartKind = 'cleat' | 'slat' | 'post' | 'side' | 'end'

export interface CratePart {
  kind: PartKind
  /** al câtelea element de acest fel */
  index: number
  /** partea lăditei pe X și pe Z (−1 sau 1; 0 dacă nu contează) */
  sx: number
  sz: number
  mesh: Mesh
  staples: Mesh[]
}

/** Montantul: prismă triunghiulară, cu unghiul drept în origine, catetele pe +X și +Z, în picioare. */
function postGeometry() {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(LEG, 0)
  shape.lineTo(0, -LEG)
  shape.closePath()
  const length = crateElements.post.length * MM
  const geometry = new ExtrudeGeometry(shape, {
    depth: length - 2 * EDGE,
    bevelEnabled: true,
    bevelThickness: EDGE,
    bevelSize: EDGE,
    bevelOffset: -EDGE,
    bevelSegments: 2,
  })
  geometry.translate(0, 0, EDGE)
  // fibra merge pe lungimea montantului (Z la extrudare, Y după ce îl ridicăm)
  woodUVs(geometry, 2)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/** Geometriile elementelor, fiecare cu lungimea pe X (fibra de-a lungul ei), centrate. */
export function crateGeometries() {
  const { side, end, slat, cleat } = crateElements
  const geometries = {
    // pereții stau pe cant: înălțimea pe Y, grosimea pe Z
    side: woodUVs(new RoundedBoxGeometry(side.length * MM, side.width * MM, side.thickness * MM, 2, EDGE)),
    end: woodUVs(new RoundedBoxGeometry(end.length * MM, end.width * MM, end.thickness * MM, 2, EDGE)),
    // fundul și traversele stau culcate: grosimea pe Y, lățimea pe Z
    slat: woodUVs(new RoundedBoxGeometry(slat.length * MM, slat.thickness * MM, slat.width * MM, 2, EDGE)),
    cleat: woodUVs(new RoundedBoxGeometry(cleat.length * MM, cleat.thickness * MM, cleat.width * MM, 2, EDGE)),
    post: postGeometry(),
    wallStaple: new BoxGeometry(0.1, 0.012, 0.008),
    floorStaple: new BoxGeometry(0.1, 0.008, 0.012),
  }
  return {
    ...geometries,
    dispose: () => Object.values(geometries).forEach((g: BufferGeometry) => g.dispose()),
  }
}

export type CrateGeometries = ReturnType<typeof crateGeometries>

export const steelMaterial = () => new MeshStandardMaterial({ color: 0x8e9194, metalness: 0.85, roughness: 0.38 })

/**
 * Lădița asamblată: toate piesele la locul lor, în ordinea în care se montează (traverse, fund,
 * montanți, laterale, capete). Capsele sunt copii ale pieselor pe care le fixează: câte trei la
 * fiecare colț, pe ambele fețe, și două pe fiecare scândură a fundului deasupra fiecărei traverse.
 */
export function buildCrate(geometries: CrateGeometries, wood: Wood, steel: MeshStandardMaterial): CratePart[] {
  const parts: CratePart[] = []
  const add = (kind: PartKind, index: number, sx: number, sz: number, mesh: Mesh) => {
    mesh.castShadow = true
    mesh.receiveShadow = true
    const part = { kind, index, sx, sz, mesh, staples: [] as Mesh[] }
    parts.push(part)
    return part
  }
  /** capsa e puțin strâmbă, ca bătută de mână; se rotește în planul feței, ca să nu iasă din lemn */
  const staple = (part: CratePart, onWall: boolean, x: number, y: number, z: number) => {
    const mesh = new Mesh(onWall ? geometries.wallStaple : geometries.floorStaple, steel)
    mesh.position.set(x, y, z)
    if (onWall) mesh.rotation.z = 0.35
    else mesh.rotation.y = 0.12
    part.mesh.add(mesh)
    part.staples.push(mesh)
  }
  /** capsele de pe fața exterioară a unui perete, deasupra montanților de la capete */
  const cornerStaples = (part: CratePart, halfLength: number, outer: number) => {
    for (const end of [-1, 1]) {
      for (const y of [-0.16, 0, 0.16]) staple(part, true, end * (halfLength - LEG / 2), y, outer * (WALL / 2 + 0.002))
    }
  }

  CLEATS_X.forEach((x, i) => {
    const mesh = new Mesh(geometries.cleat, wood.board())
    mesh.rotation.y = Math.PI / 2
    mesh.position.set(x, CLEAT_H / 2, 0)
    add('cleat', i, 0, 0, mesh)
  })

  for (let i = 0; i < crate.slat.count; i++) {
    const mesh = new Mesh(geometries.slat, wood.board())
    mesh.position.set(0, CLEAT_H + SLAT_T / 2, -INNER_W / 2 + SLAT_W / 2 + i * (SLAT_W + SLAT_GAP))
    const part = add('slat', i, 0, 0, mesh)
    for (const x of CLEATS_X) for (const z of [-0.3, 0.3]) staple(part, false, x, SLAT_T / 2 + 0.002, z)
  }

  let postIndex = 0
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const mesh = new Mesh(geometries.post, wood.post())
      // oglindim prisma ca unghiul drept să stea în colțul interior, iar catetele pe pereți
      mesh.scale.set(-sx, 1, -sz)
      mesh.position.set(sx * (LENGTH / 2 - WALL), FLOOR, sz * (WIDTH / 2 - WALL))
      add('post', postIndex++, sx, sz, mesh)
    }
  }

  for (const [i, s] of [-1, 1].entries()) {
    const side = new Mesh(geometries.side, wood.board())
    side.position.set(0, CLEAT_H + WALL_H / 2, s * (WIDTH / 2 - WALL / 2))
    cornerStaples(add('side', i, 0, s, side), crateElements.side.length * MM * 0.5, s)
  }
  for (const [i, s] of [-1, 1].entries()) {
    const end = new Mesh(geometries.end, wood.board())
    end.rotation.y = Math.PI / 2
    end.position.set(s * (LENGTH / 2 - WALL / 2), CLEAT_H + WALL_H / 2, 0)
    // după rotire, +Z local e +X în lume: fața exterioară a capătului din dreapta e +Z local
    cornerStaples(add('end', i, s, 0, end), WIDTH / 2 - WALL, s)
  }
  return parts
}

// Lădița produsă, după desenul tehnic și lădița reală. Toate cotele sunt în mm.
// Din ele se construiesc elementele din catalog, lădița 3D din primul ecran și fotografiile
// produselor (tools/art): o cotă schimbată aici se schimbă peste tot.

export const crate = {
  /** exterior */
  length: 588,
  width: 390,
  /** laterale și capete din scândură subțire; capetele merg pe toată lățimea și acoperă lateralele */
  wall: { height: 55, thickness: 4 },
  /** fundul: scânduri pe lungime, cu rosturi între ele, cele de margine lipite de laterale */
  slat: { count: 3, width: 112, thickness: 5 },
  /** traverse sub fund, pe toată lățimea; pe ele stau pereții și fundul (poziția = mijlocul, față de centru) */
  cleat: { width: 30, height: 8, centers: [-279, -105, 105, 279] },
  /** montant triunghiular în colțul interior; iese deasupra laterelor, ca lădițele să se stivuiască */
  post: { leg: 33, length: 100, count: 4 },
} as const

export interface CrateElement {
  /** mm */
  length: number
  width: number
  thickness: number
  /** câte intră într-o lădiță */
  count: number
}

const innerLength = crate.length - 2 * crate.wall.thickness

export const crateElements = {
  side: { length: innerLength, width: crate.wall.height, thickness: crate.wall.thickness, count: 2 },
  end: { length: crate.width, width: crate.wall.height, thickness: crate.wall.thickness, count: 2 },
  slat: { length: innerLength, width: crate.slat.width, thickness: crate.slat.thickness, count: crate.slat.count },
  cleat: { length: crate.width, width: crate.cleat.width, thickness: crate.cleat.height, count: crate.cleat.centers.length },
  post: { length: crate.post.length, width: crate.post.leg, thickness: crate.post.leg, count: crate.post.count },
} satisfies Record<string, CrateElement>

/** Înălțimea totală, până în vârful montanților: traversă + fund + montant. */
export const crateHeight = crate.cleat.height + crate.slat.thickness + crate.post.length

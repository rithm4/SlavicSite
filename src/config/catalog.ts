// Catalogul și regulile de preț. Toate prețurile sunt FĂRĂ TVA, în EUR.
// Produsele sunt elementele lăditei din config/crate.ts, cu aceleași dimensiuni ca lădița 3D.
// ATENȚIE: prețurile și cantitățile pe palet sunt de test, de înlocuit cu cele reale.
import { crate, crateElements, crateHeight } from './crate'
import type { CrateElement } from './crate'

export interface StandardProduct {
  id: string
  name: string
  /** Dimensiuni afișate, în mm. */
  size: string
  unit: string
  price: number
  /** Câte bucăți încap pe un palet. */
  piecesPerPallet: number
  /** Comanda minimă, în unități. */
  minQty: number
  /** Câte bucăți intră într-o lădiță (pentru elemente). */
  perCrate?: number
  /** Ce conține (pentru set). */
  contents?: string
}

const size = (e: CrateElement) => `${e.length} × ${e.width} × ${e.thickness}`
const { side, end, slat, cleat, post } = crateElements

export const standardProducts: StandardProduct[] = [
  { id: 'laterala', name: 'Laterală', size: size(side), unit: 'buc', price: 0.12, minQty: 100, piecesPerPallet: 6000, perCrate: side.count },
  { id: 'capat', name: 'Capăt', size: size(end), unit: 'buc', price: 0.1, minQty: 100, piecesPerPallet: 9000, perCrate: end.count },
  { id: 'fund', name: 'Scândură de fund', size: size(slat), unit: 'buc', price: 0.19, minQty: 100, piecesPerPallet: 2500, perCrate: slat.count },
  { id: 'traversa', name: 'Traversă', size: size(cleat), unit: 'buc', price: 0.1, minQty: 100, piecesPerPallet: 8500, perCrate: cleat.count },
  { id: 'montant', name: 'Montant de colț triunghiular', size: size(post), unit: 'buc', price: 0.08, minQty: 200, piecesPerPallet: 14000, perCrate: post.count },
  {
    id: 'set-lada',
    name: 'Set ladă completă (nemontată)',
    size: `${crate.length} × ${crate.width} × ${crateHeight}`,
    unit: 'set',
    price: 1.69,
    minQty: 10,
    piecesPerPallet: 400,
    contents: `${side.count} laterale, ${end.count} capete, ${slat.count} scânduri de fund, ${cleat.count} traverse, ${post.count} montanți`,
  },
]

export interface WoodType {
  id: string
  name: string
  /** Preț material pe m³. */
  pricePerM3: number
}

export const woodTypes: WoodType[] = [
  { id: 'plop', name: 'Plop', pricePerM3: 210 },
  { id: 'pin', name: 'Pin', pricePerM3: 260 },
  { id: 'molid', name: 'Molid', pricePerM3: 280 },
  { id: 'fag', name: 'Fag', pricePerM3: 445 },
]

export interface Finish {
  id: string
  name: string
  /** Majorare procentuală aplicată costului materialului. */
  surchargePct: number
}

export const finishes: Finish[] = [
  { id: 'slefuit', name: 'Șlefuire', surchargePct: 0.15 },
  { id: 'ispm15', name: 'Tratament termic ISPM 15', surchargePct: 0.1 },
  { id: 'tesit', name: 'Muchii teșite', surchargePct: 0.08 },
]

export const customRules = {
  /** Cost fix de debitare pe bucată. */
  cutFeePerPiece: 0.04,
  /** Prețul minim al unei bucăți personalizate. */
  minPiecePrice: 0.08,
  minQty: 10,
  limitsMm: {
    length: { min: 50, max: 2000 },
    width: { min: 20, max: 500 },
    thickness: { min: 4, max: 50 },
  },
}

/** Reducere în funcție de valoarea totală a produselor (fără TVA). */
export const volumeDiscounts = [
  { minSubtotal: 2500, pct: 0.1 },
  { minSubtotal: 1000, pct: 0.05 },
]

export const deliveryRules = {
  /** null = tariful nu e stabilit încă; livrarea nu intră în total și se discută separat. */
  fee: null as number | null,
  /** Peste această valoare (produse, fără TVA), livrarea e gratuită. */
  freeFrom: 750,
}

/**
 * Paletul folosit pentru estimarea numărului de paleți la elementele personalizate
 * (EUR 1200 × 800, încărcat până la înălțimea dată).
 */
export const palletRules = {
  lengthMm: 1200,
  widthMm: 800,
  loadHeightMm: 1000,
  /** Cât din volum e efectiv ocupat de lemn (stivuire, distanțiere). */
  fillFactor: 0.85,
}

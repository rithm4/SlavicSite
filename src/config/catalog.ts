// Catalogul și regulile de preț. Toate prețurile sunt FĂRĂ TVA, în EUR.
// ATENȚIE: date de test, de înlocuit cu cele reale.

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
}

export const standardProducts: StandardProduct[] = [
  { id: 'lat-400', name: 'Scândură laterală', size: '400 × 100 × 10', unit: 'buc', price: 0.23, minQty: 50, piecesPerPallet: 3000 },
  { id: 'lat-500', name: 'Scândură laterală', size: '500 × 100 × 10', unit: 'buc', price: 0.27, minQty: 50, piecesPerPallet: 2400 },
  { id: 'cap-300', name: 'Scândură capăt', size: '300 × 100 × 15', unit: 'buc', price: 0.21, minQty: 50, piecesPerPallet: 2000 },
  { id: 'fund-400', name: 'Fund placaj', size: '400 × 300 × 4', unit: 'buc', price: 0.49, minQty: 20, piecesPerPallet: 1500 },
  { id: 'sipca-20', name: 'Șipcă de colț', size: '250 × 20 × 20', unit: 'buc', price: 0.08, minQty: 100, piecesPerPallet: 5000 },
  { id: 'maner', name: 'Scândură cu mâner decupat', size: '300 × 120 × 15', unit: 'buc', price: 0.35, minQty: 20, piecesPerPallet: 1500 },
  { id: 'set-403020', name: 'Set ladă completă (nemontată)', size: '400 × 300 × 200', unit: 'set', price: 2.9, minQty: 10, piecesPerPallet: 60 },
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

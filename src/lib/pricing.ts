import {
  customRules,
  deliveryRules,
  finishes,
  palletRules,
  standardProducts,
  volumeDiscounts,
  woodTypes,
} from '../config/catalog'
import { vatRate } from '../config/company'
import type { CustomItem, OrderDraft, Quote, QuoteLine } from './types'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function customUnitPrice(item: CustomItem): number {
  const wood = woodTypes.find((w) => w.id === item.woodId)
  if (!wood) return 0
  const volumeM3 = (item.lengthMm * item.widthMm * item.thicknessMm) / 1e9
  const material = volumeM3 * wood.pricePerM3
  const surcharge = finishes
    .filter((f) => item.finishIds.includes(f.id))
    .reduce((sum, f) => sum + f.surchargePct, 0)
  const price = material * (1 + surcharge) + customRules.cutFeePerPiece
  return round2(Math.max(customRules.minPiecePrice, price))
}

/** Returnează mesajul de eroare pentru un element personalizat sau null dacă e valid. */
export function validateCustomItem(item: CustomItem): string | null {
  const { limitsMm, minQty } = customRules
  const checks: [number, { min: number; max: number }, string][] = [
    [item.lengthMm, limitsMm.length, 'Lungimea'],
    [item.widthMm, limitsMm.width, 'Lățimea'],
    [item.thicknessMm, limitsMm.thickness, 'Grosimea'],
  ]
  for (const [value, { min, max }, label] of checks) {
    if (!Number.isFinite(value) || value < min || value > max) {
      return `${label} trebuie să fie între ${min} și ${max} mm.`
    }
  }
  if (!Number.isInteger(item.qty) || item.qty < minQty) {
    return `Cantitatea minimă este ${minQty} buc.`
  }
  if (!woodTypes.some((w) => w.id === item.woodId)) return 'Alegeți tipul de lemn.'
  return null
}

export function computeQuote(draft: OrderDraft): Quote {
  const lines: QuoteLine[] = []
  let totalPieces = 0

  for (const product of standardProducts) {
    const qty = draft.standard[product.id] ?? 0
    if (qty <= 0) continue
    totalPieces += qty
    lines.push({
      description: product.name,
      details: `${product.size} mm`,
      unit: product.unit,
      qty,
      unitPrice: product.price,
      pallets: qty / product.piecesPerPallet,
      total: round2(product.price * qty),
    })
  }

  for (const item of draft.custom) {
    if (validateCustomItem(item)) continue
    const unitPrice = customUnitPrice(item)
    const wood = woodTypes.find((w) => w.id === item.woodId)!
    const finishNames = finishes.filter((f) => item.finishIds.includes(f.id)).map((f) => f.name)
    totalPieces += item.qty
    lines.push({
      description: item.name.trim() || 'Element personalizat',
      details: [
        `${item.lengthMm} × ${item.widthMm} × ${item.thicknessMm} mm`,
        wood.name,
        ...finishNames,
      ].join(', '),
      unit: 'buc',
      qty: item.qty,
      unitPrice,
      pallets: item.qty / customPiecesPerPallet(item),
      total: round2(unitPrice * item.qty),
    })
  }

  const productsSubtotal = round2(lines.reduce((s, l) => s + l.total, 0))
  const discountPct = volumeDiscounts.find((d) => productsSubtotal >= d.minSubtotal)?.pct ?? 0
  const discount = round2(productsSubtotal * discountPct)
  const deliveryFee =
    draft.deliveryMethod === 'delivery' && productsSubtotal > 0 && productsSubtotal < deliveryRules.freeFrom
      ? deliveryRules.fee
      : 0
  const netTotal = round2(productsSubtotal - discount + deliveryFee)
  const vat = round2(netTotal * vatRate)

  return {
    lines,
    productsSubtotal,
    discountPct,
    discount,
    deliveryFee,
    netTotal,
    vat,
    total: round2(netTotal + vat),
    totalPieces,
    totalPallets: Math.ceil(round2(lines.reduce((s, l) => s + l.pallets, 0))),
  }
}

/** Estimare: câte bucăți de dimensiunile date încap pe un palet. */
export function customPiecesPerPallet(item: Pick<CustomItem, 'lengthMm' | 'widthMm' | 'thicknessMm'>): number {
  const pieceVolume = item.lengthMm * item.widthMm * item.thicknessMm
  if (pieceVolume <= 0) return 1
  const { lengthMm, widthMm, loadHeightMm, fillFactor } = palletRules
  return Math.max(1, Math.floor((lengthMm * widthMm * loadHeightMm * fillFactor) / pieceVolume))
}

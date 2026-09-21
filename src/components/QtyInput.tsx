import { approxPallets, formatQty } from '../lib/format'
import type { QtyUnit } from '../lib/types'

interface QtyInputProps {
  /** Cantitatea în bucăți (așa e stocată mereu). */
  qty: number
  piecesPerPallet: number
  unit: QtyUnit
  /** Pasul butoanelor −/+ când se lucrează în bucăți. */
  pieceStep: number
  /** Eticheta unității la bucăți: „buc" sau „set". */
  pieceLabel: string
  label: string
  invalid?: boolean
  onChange: (pieces: number) => void
}

export function QtyInput({ qty, piecesPerPallet, unit, pieceStep, pieceLabel, label, invalid, onChange }: QtyInputProps) {
  const inPallets = unit === 'pallet'
  const pallets = qty / piecesPerPallet
  // Cantitățile mici (sub 0,01 paleți) apar ca 0,01, ca să nu pară zero; exactul e afișat dedesubt.
  const shown = inPallets ? (qty > 0 ? Math.max(0.01, Math.round(pallets * 100) / 100) : 0) : qty

  const setShown = (value: number) => {
    const v = Math.max(0, value)
    onChange(inPallets ? Math.round(v * piecesPerPallet) : Math.floor(v))
  }

  const step = inPallets ? 1 : pieceStep
  const dec = () => {
    const next = inPallets ? Math.ceil(pallets) - 1 : qty - step
    setShown(next < (inPallets ? 1 : step) ? 0 : next)
  }
  const inc = () => setShown(inPallets ? Math.floor(pallets) + 1 : qty < step ? step : qty + step)

  return (
    <div className="qty">
      <div className="qty-stepper">
        <button type="button" aria-label={`Scade ${label}`} disabled={qty === 0} onClick={dec}>
          −
        </button>
        <input
          type="number"
          min={0}
          step={inPallets ? 0.5 : 1}
          inputMode="decimal"
          placeholder="0"
          aria-label={`${label}, în ${inPallets ? 'paleți' : pieceLabel}`}
          aria-invalid={invalid}
          value={shown || ''}
          onChange={(e) => setShown(Number(e.target.value.replace(',', '.')) || 0)}
        />
        <button type="button" aria-label={`Crește ${label}`} onClick={inc}>
          +
        </button>
      </div>
      <small className="qty-unit">
        {inPallets ? (qty > 0 ? `${formatQty(qty)} ${pieceLabel}` : 'paleți') : qty > 0 ? approxPallets(pallets) : pieceLabel}
      </small>
    </div>
  )
}

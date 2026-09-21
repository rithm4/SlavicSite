import { customRules, finishes, woodTypes } from '../config/catalog'
import { currency } from '../config/company'
import { formatMoney, formatQty } from '../lib/format'
import { customPiecesPerPallet, customUnitPrice, round2, validateCustomItem } from '../lib/pricing'
import type { CustomItem, QtyUnit } from '../lib/types'
import { QtyInput } from './QtyInput'
import type { StepProps } from './stepProps'

type NumericKey = 'lengthMm' | 'widthMm' | 'thicknessMm'

function newItem(unit: QtyUnit): CustomItem {
  const dims = { lengthMm: 400, widthMm: 100, thicknessMm: 10 }
  return {
    id: crypto.randomUUID(),
    name: '',
    woodId: woodTypes[0].id,
    ...dims,
    // În modul paleți pornim de la un palet întreg, altfel de la cantitatea minimă.
    qty: unit === 'pallet' ? customPiecesPerPallet(dims) : customRules.minQty,
    finishIds: [],
  }
}

export function CustomItems({ draft, update }: StepProps) {
  const { limitsMm } = customRules

  const patchItem = (id: string, patch: Partial<CustomItem>) =>
    update({ custom: draft.custom.map((it) => (it.id === id ? { ...it, ...patch } : it)) })

  const removeItem = (id: string) => update({ custom: draft.custom.filter((it) => it.id !== id) })

  const toggleFinish = (item: CustomItem, finishId: string) =>
    patchItem(item.id, {
      finishIds: item.finishIds.includes(finishId)
        ? item.finishIds.filter((f) => f !== finishId)
        : [...item.finishIds, finishId],
    })

  const numberField = (item: CustomItem, key: NumericKey, label: string, suffix: string, limits?: { min: number; max: number }) => (
    <label className="field">
      <span>{label}</span>
      <span className="input-suffix">
        <input
          type="number"
          inputMode="numeric"
          min={limits?.min}
          max={limits?.max}
          value={item[key] || ''}
          onChange={(e) => patchItem(item.id, { [key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
        />
        <span>{suffix}</span>
      </span>
      {limits && (
        <small className="muted">
          {limits.min}–{limits.max}
        </small>
      )}
    </label>
  )

  return (
    <>
      {draft.custom.length === 0 && (
        <p className="hint">Aveți nevoie de alte dimensiuni? Introduceți-le și calculăm prețul pe loc.</p>
      )}

      {draft.custom.map((item, index) => {
        const error = validateCustomItem(item)
        const unitPrice = error ? null : customUnitPrice(item)
        const perPallet = customPiecesPerPallet(item)
        return (
          <div className="custom-card" key={item.id}>
            <div className="custom-card-head">
              <strong>Element {index + 1}</strong>
              <button type="button" className="btn-link danger" onClick={() => removeItem(item.id)}>
                Elimină
              </button>
            </div>

            <div className="grid">
              <label className="field">
                <span>Denumire (opțional)</span>
                <input
                  type="text"
                  placeholder="ex. Scândură laterală"
                  value={item.name}
                  onChange={(e) => patchItem(item.id, { name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Specie lemn</span>
                <select value={item.woodId} onChange={(e) => patchItem(item.id, { woodId: e.target.value })}>
                  {woodTypes.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-3">
              {numberField(item, 'lengthMm', 'Lungime', 'mm', limitsMm.length)}
              {numberField(item, 'widthMm', 'Lățime', 'mm', limitsMm.width)}
              {numberField(item, 'thicknessMm', 'Grosime', 'mm', limitsMm.thickness)}
            </div>

            <div className="custom-qty">
              <span className="field-label">Cantitate</span>
              <QtyInput
                qty={item.qty}
                piecesPerPallet={perPallet}
                unit={draft.qtyUnit}
                pieceStep={customRules.minQty}
                pieceLabel="buc"
                label={`element ${index + 1}`}
                onChange={(qty) => patchItem(item.id, { qty })}
              />
              <small className="muted">≈ {formatQty(perPallet)} buc/palet</small>
            </div>

            <div className="checks">
              <span className="checks-label">Prelucrare:</span>
              {finishes.map((f) => (
                <label className="check" key={f.id}>
                  <input type="checkbox" checked={item.finishIds.includes(f.id)} onChange={() => toggleFinish(item, f.id)} />
                  {f.name}
                </label>
              ))}
            </div>

            <div className="custom-card-foot">
              {error ? (
                <p className="field-error">{error}</p>
              ) : (
                <>
                  <span className="muted">
                    {formatMoney(unitPrice!)} {currency}/buc × {formatQty(item.qty)} buc
                  </span>
                  <strong>
                    {formatMoney(round2(unitPrice! * item.qty))} {currency}
                  </strong>
                </>
              )}
            </div>
          </div>
        )
      })}

      <button type="button" className="btn-add" onClick={() => update({ custom: [...draft.custom, newItem(draft.qtyUnit)] })}>
        + Adaugă element la dimensiunile dvs.
      </button>
    </>
  )
}

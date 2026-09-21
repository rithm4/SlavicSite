import { useState } from 'react'
import { standardProducts } from '../config/catalog'
import { currency } from '../config/company'
import { formatMoney, formatQty } from '../lib/format'
import type { QtyUnit } from '../lib/types'
import { CustomItems } from './CustomItems'
import { QtyInput } from './QtyInput'
import type { StepProps } from './stepProps'

type Tab = 'standard' | 'custom'

export function ProductsStep(props: StepProps) {
  const { draft, update } = props
  const standardCount = Object.keys(draft.standard).length
  const customCount = draft.custom.length
  const [tab, setTab] = useState<Tab>(customCount > 0 && standardCount === 0 ? 'custom' : 'standard')

  const setQty = (id: string, qty: number) => {
    const standard = { ...draft.standard }
    if (qty > 0) standard[id] = qty
    else delete standard[id]
    update({ standard })
  }

  const tabs: [Tab, string, string, number][] = [
    ['standard', 'Din catalog', 'Dimensiuni standard', standardCount],
    ['custom', 'Pe dimensiuni', 'Mărimile dvs., preț automat', customCount],
  ]

  return (
    <div className="step">
      <div className="step-title-row">
        <h2 className="step-title">Ce doriți să comandați?</h2>
        <div className="unit-toggle" role="radiogroup" aria-label="Cantitate în">
          <span className="muted">Cantitate în:</span>
          {(
            [
              ['pallet', 'Paleți'],
              ['piece', 'Bucăți'],
            ] as [QtyUnit, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={draft.qtyUnit === value}
              className={draft.qtyUnit === value ? 'is-active' : ''}
              onClick={() => update({ qtyUnit: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="type-tabs" role="tablist">
        {tabs.map(([value, label, note, count]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'is-active' : ''}
            onClick={() => setTab(value)}
          >
            <span className="type-tab-label">
              {label}
              {count > 0 && <span className="badge">{count}</span>}
            </span>
            <small>{note}</small>
          </button>
        ))}
      </div>

      {tab === 'standard' ? (
        <ul className="product-list" role="tabpanel">
          {standardProducts.map((p) => {
            const qty = draft.standard[p.id] ?? 0
            const tooLow = qty > 0 && qty < p.minQty
            return (
              <li className={`product-row${qty > 0 ? ' is-selected' : ''}`} key={p.id}>
                <div className="product-info">
                  <strong>
                    {p.name} <span className="product-size">{p.size} mm</span>
                  </strong>
                  <span className="muted">
                    {formatMoney(p.price)} {currency}/{p.unit} · {formatQty(p.piecesPerPallet)} {p.unit}/palet
                  </span>
                </div>
                <QtyInput
                  qty={qty}
                  piecesPerPallet={p.piecesPerPallet}
                  unit={draft.qtyUnit}
                  pieceStep={p.minQty}
                  pieceLabel={p.unit}
                  label={`${p.name} ${p.size}`}
                  invalid={tooLow}
                  onChange={(pieces) => setQty(p.id, pieces)}
                />
                <div className="product-total">
                  {qty > 0 ? (
                    `${formatMoney(p.price * qty)} ${currency}`
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
                {tooLow && (
                  <p className="field-error">
                    Cantitatea minimă este {p.minQty} {p.unit}.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div role="tabpanel">
          <CustomItems {...props} />
        </div>
      )}

      <p className="tab-note muted">Puteți combina produse din catalog și la comandă în aceeași comandă.</p>
    </div>
  )
}

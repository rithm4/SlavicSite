import { useState } from 'react'
import { standardProducts } from '../config/catalog'
import { currency } from '../config/company'
import { formatMoney } from '../lib/format'
import { CustomItems } from './CustomItems'
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
    ['standard', 'Din catalog', 'Dimensiuni standard, gata de comandat', standardCount],
    ['custom', 'La dimensiunile mele', 'Introduceți mărimile, prețul se calculează automat', customCount],
  ]

  return (
    <div className="step">
      <h2 className="step-title">Ce doriți să comandați?</h2>

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
                  <strong>{p.name}</strong>
                  <span className="muted">
                    {p.size} mm · {formatMoney(p.price)} {currency}/{p.unit} · min. {p.minQty}
                  </span>
                </div>
                <div className="qty-stepper">
                  <button
                    type="button"
                    aria-label={`Scade ${p.name} ${p.size}`}
                    disabled={qty === 0}
                    onClick={() => setQty(p.id, qty - p.minQty < p.minQty ? 0 : qty - p.minQty)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={`Cantitate ${p.name} ${p.size}`}
                    value={qty || ''}
                    aria-invalid={tooLow}
                    onChange={(e) => setQty(p.id, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  />
                  <button
                    type="button"
                    aria-label={`Crește ${p.name} ${p.size}`}
                    onClick={() => setQty(p.id, qty < p.minQty ? p.minQty : qty + p.minQty)}
                  >
                    +
                  </button>
                </div>
                <div className="product-total">{qty > 0 ? `${formatMoney(p.price * qty)} ${currency}` : ''}</div>
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

      <p className="tab-note muted">
        Puteți combina: produsele alese în ambele secțiuni intră în aceeași comandă.
      </p>
    </div>
  )
}

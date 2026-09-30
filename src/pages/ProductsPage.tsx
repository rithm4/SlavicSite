import { ArrowRight, Paintbrush, Percent, TreeDeciduous } from 'lucide-react'
import { customRules, finishes, standardProducts, volumeDiscounts, woodTypes } from '../config/catalog'
import { crate } from '../config/crate'
import { currency } from '../config/company'
import { HeroFacts, PageHero } from '../components/site/PageHero'
import { ProductCard } from '../components/site/ProductCard'
import { SectionHead } from '../components/site/SectionHead'
import { formatMoney } from '../lib/format'
import { href } from '../lib/useRoute'

const pct = (n: number) => `${Math.round(n * 100)}%`

export function ProductsPage() {
  const limits = customRules.limitsMm
  const cheapest = Math.min(...standardProducts.filter((p) => p.unit === 'buc').map((p) => p.price))
  const specs = [
    ['Lungime', `${limits.length.min}–${limits.length.max} mm`],
    ['Lățime', `${limits.width.min}–${limits.width.max} mm`],
    ['Grosime', `${limits.thickness.min}–${limits.thickness.max} mm`],
    ['Comandă minimă', `${customRules.minQty} buc`],
  ]
  return (
    <>
      <PageHero
        title="Produse"
        aside={
          <HeroFacts
            items={[
              { label: 'Preț de la', value: `${formatMoney(cheapest)} ${currency}/buc` },
              { label: 'Specii de lemn', value: woodTypes.length },
              { label: 'Pentru export', value: 'ISPM 15' },
            ]}
          />
        }
      >
        Elementele standard ale lăditei și elemente debitate după dimensiunile dumneavoastră.
      </PageHero>

      <section className="band">
        <div className="container">
          <SectionHead
            title="Catalog standard"
            text={`Elementele unei lădițe de ${crate.length} × ${crate.width} mm, la bucată sau ca set complet. Prețuri în ${currency}, fără TVA.`}
          />
          <div className="product-grid cols-3">
            {standardProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="band band-alt">
        <div className="container two-col">
          <div className="reveal">
            <span className="eyebrow">Personalizat</span>
            <h2>Elemente la comandă</h2>
            <p>
              Debităm scânduri după dimensiunile de care aveți nevoie. În formularul de comandă alegeți specia de lemn,
              dimensiunile și finisajele, iar prețul apare imediat.
            </p>
            <dl className="spec-table">
              {specs.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <a className="btn btn-lg btn-icon" href={href('comanda')}>
              Calculează prețul
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          <div className="info-cards">
            <div className="info-card reveal">
              <h3 className="card-title">
                <TreeDeciduous size={18} aria-hidden="true" />
                Specii de lemn
              </h3>
              <ul className="price-list">
                {woodTypes.map((w) => (
                  <li key={w.id}>
                    <span>{w.name}</span>
                    <span className="muted">
                      {formatMoney(w.pricePerM3)} {currency}/m³
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="info-card reveal">
              <h3 className="card-title">
                <Paintbrush size={18} aria-hidden="true" />
                Finisaje
              </h3>
              <ul className="price-list">
                {finishes.map((f) => (
                  <li key={f.id}>
                    <span>{f.name}</span>
                    <span className="muted">+{pct(f.surchargePct)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="info-card reveal">
              <h3 className="card-title">
                <Percent size={18} aria-hidden="true" />
                Reduceri de volum
              </h3>
              <ul className="price-list">
                {[...volumeDiscounts].reverse().map((d) => (
                  <li key={d.minSubtotal}>
                    <span>
                      Comenzi de la {formatMoney(d.minSubtotal)} {currency}
                    </span>
                    <span className="muted">−{pct(d.pct)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

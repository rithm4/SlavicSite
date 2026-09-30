import { ArrowRight, ArrowUpRight, FileText, Layers, Stamp, Trees } from 'lucide-react'
import { useRef } from 'react'
import type { ComponentType } from 'react'
import { standardProducts, woodTypes } from '../config/catalog'
import { crate, crateElements } from '../config/crate'
import { currency } from '../config/company'
import { Carousel } from '../components/site/Carousel'
import { CrateAssembly } from '../components/site/crate/CrateAssembly'
import { DimensionsArt, InvoiceArt, PalletArt, SetArt } from '../components/site/Illustrations'
import { ProductCard } from '../components/site/ProductCard'
import { SectionHead } from '../components/site/SectionHead'
import { Steps } from '../components/site/Steps'
import { formatMoney } from '../lib/format'
import { useHeroPin } from '../lib/useHeroPin'
import { href, orderHref } from '../lib/useRoute'

const elementCount = Object.values(crateElements).reduce((n, e) => n + e.count, 0)

// ISPM 15 e deja în cardurile de sus; aici, ce nu apare acolo
const advantages: { art: ComponentType; title: string; text: string }[] = [
  {
    art: DimensionsArt,
    title: 'Dimensiuni la comandă',
    text: 'Pe lângă catalog, debităm elemente după dimensiunile dumneavoastră, din plop, pin, molid sau fag.',
  },
  {
    art: SetArt,
    title: 'Setul complet, gata de montat',
    text: `Toate cele ${elementCount} elemente ale unei lădițe, livrate împreună pe paleți: le montați direct la voi.`,
  },
  {
    art: PalletArt,
    title: 'Livrare pe paleți',
    text: 'Comandați în paleți sau în bucăți. Ridicare de la depozit sau livrare la adresa firmei.',
  },
  {
    art: InvoiceArt,
    title: 'Proformă imediat',
    text: 'Configurați comanda online și descărcați factura proformă în PDF, fără să așteptați o ofertă pe e-mail.',
  },
]

const steps: { title: string; text: string }[] = [
  { title: 'Alegeți produsele', text: 'Din catalog sau cu dimensiuni personalizate.' },
  { title: 'Alegeți data', text: 'Calendarul arată zilele libere pentru producție.' },
  { title: 'Datele firmei', text: 'Denumirea, CUI-ul și persoana de contact.' },
  { title: 'Primiți proforma', text: 'Factura proformă în PDF, gata de plată, cu datele noastre bancare.' },
]

export function HomePage() {
  const crateSet = standardProducts.find((p) => p.id.startsWith('set'))
  const heroRef = useRef<HTMLElement>(null)
  useHeroPin(heroRef)
  return (
    <>
      {/* primul ecran stă pe loc cât se asamblează lădița (vezi useHeroPin) */}
      {/* pe ecran lat: titlul în stânga, lădița în dreapta, banda cu repere dedesubt */}
      <section className="hero hero-split" ref={heroRef}>
        <div className="hero-pin">
          <div className="container">
            <div className="hero-top">
              <div>
                <p className="kicker">Producător din Satu Mare, România</p>
                <h1>Elemente din lemn pentru lădițe, direct de la producător</h1>
              </div>
              <div className="hero-side">
                <p className="hero-lead">
                  Scânduri, funduri și seturi complete pentru ambalaje de fructe, legume și mărfuri industriale. Comenzi
                  pentru firme, pe paleți, cu factură proformă generată pe loc.
                </p>
                <div className="hero-actions">
                  <a className="btn btn-lg btn-icon" href={href('comanda')}>
                    Comandă online
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>
                  <a className="btn btn-lg btn-outline" href={href('produse')}>
                    Vezi produsele
                  </a>
                </div>
              </div>
            </div>

            <div className="hero-bento-track">
              <div className="hero-bento">
                <figure className="hb-card hb-image">
                  <CrateAssembly />
                  {crateSet && (
                    // banda de sub lădiță: ce e, cât costă și, la un clic, comanda cu setul deja adăugat
                    <figcaption>
                      <a className="hb-caption" href={orderHref(crateSet.id)}>
                        <span className="hb-caption-text">
                          <strong>Set complet pentru o lădiță</strong>
                          <small>
                            {crate.length} × {crate.width} mm · {elementCount} elemente
                            <span className="hide-sm">, livrate nemontate</span>
                          </small>
                        </span>
                        <span className="hb-caption-price">
                          {formatMoney(crateSet.price)} {currency}
                          <small>/ {crateSet.unit}</small>
                        </span>
                        <ArrowRight className="hb-caption-go" size={18} aria-hidden="true" />
                      </a>
                    </figcaption>
                  )}
                </figure>

                {/* patru carduri cu repere: iconiță sus, jos titlul și o frază care spune ce înseamnă */}
                <ul className="hero-cards">
                  <li>
                    <div className="hc-card is-accent">
                      <span className="hc-icon" aria-hidden="true">
                        <Stamp size={20} />
                      </span>
                      <span className="hc-text">
                        <strong>ISPM 15</strong>
                        <span>Tratament termic și marcaj, la cerere</span>
                      </span>
                    </div>
                  </li>
                  <li>
                    <a className="hc-card" href={href('produse')}>
                      <span className="hc-icon" aria-hidden="true">
                        <Layers size={20} />
                      </span>
                      <ArrowUpRight className="hc-go" size={18} aria-hidden="true" />
                      <span className="hc-text">
                        <strong>{standardProducts.length} elemente standard</strong>
                        <span>Tot ce intră într-o lădiță, plus setul complet</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <div className="hc-card">
                      <span className="hc-icon" aria-hidden="true">
                        <Trees size={20} />
                      </span>
                      <span className="hc-text">
                        <strong>{woodTypes.map((w, i) => (i ? w.name.toLowerCase() : w.name)).join(', ')}</strong>
                        <span>{woodTypes.length} specii, pentru elemente la comandă</span>
                      </span>
                    </div>
                  </li>
                  <li>
                    <a className="hc-card is-dark" href={href('comanda')}>
                      <span className="hc-icon" aria-hidden="true">
                        <FileText size={20} />
                      </span>
                      <span className="hc-go is-round" aria-hidden="true">
                        <ArrowRight size={18} />
                      </span>
                      <span className="hc-text">
                        <strong>Factură proformă</strong>
                        <span>PDF, imediat după comandă</span>
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <SectionHead
            eyebrow="Avantaje"
            title="De ce să lucrați cu noi"
            text="Producem în serie elementele de care are nevoie o linie de ambalare: aceleași dimensiuni, aceeași calitate, la fiecare livrare."
            action={
              <a className="btn-link btn-icon" href={href('despre')}>
                Despre companie
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            }
          />
          <Carousel className="why-bento">
            {advantages.map(({ art: Art, title, text }) => (
              <article key={title} className="why-card reveal">
                <div className="why-art">
                  <Art />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </Carousel>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <SectionHead
            eyebrow="Catalog"
            title="Produse din catalog"
            text="Prețuri fără TVA. Pentru volume mari se aplică reducere automată."
            action={
              <a className="btn-link btn-icon" href={href('produse')}>
                Tot catalogul
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            }
          />
          <Carousel className="product-grid">
            {standardProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Carousel>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <SectionHead
            eyebrow="Proces"
            title="Cum comandați"
            text="Toată comanda durează câteva minute, fără să așteptați o ofertă."
            action={
              <a className="btn-link btn-icon" href={href('comanda')}>
                Începeți comanda
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            }
          />
          <Steps items={steps} />
        </div>
      </section>

      <section className="cta-band">
        <div className="container">
          <div className="cta-inner reveal">
            <div>
              <h2>Aveți nevoie de o dimensiune care nu e în catalog?</h2>
              <p>Introduceți lungimea, lățimea și grosimea. Prețul se calculează imediat.</p>
            </div>
            <a className="btn btn-lg btn-light btn-icon" href={href('comanda')}>
              Configurează comanda
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

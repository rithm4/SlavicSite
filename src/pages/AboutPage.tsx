import { Apple, ArrowRight, Factory, Ship } from 'lucide-react'
import palletImage from '../assets/art/pallet-strapped.webp'
import crateImage from '../assets/products/set-lada.webp'
import { finishes, woodTypes } from '../config/catalog'
import { crateElements } from '../config/crate'
import { HeroFacts, PageHero } from '../components/site/PageHero'
import { SectionHead } from '../components/site/SectionHead'
import { Steps } from '../components/site/Steps'
import { href } from '../lib/useRoute'

// De completat când le avem de la firmă: anul fondării, capacitatea lunară, suprafața secției,
// echipamentele și fotografii reale din producție (în locul randărilor de mai jos).

const clients = [
  { icon: Apple, title: 'Producători de fructe și legume', text: 'Lădițe pentru mere, struguri, cireșe și legume, pentru piața internă și export.' },
  { icon: Ship, title: 'Exportatori', text: 'Ambalaje tratate ISPM 15, cu marcaj, conform cerințelor fitosanitare.' },
  { icon: Factory, title: 'Fabrici și depozite', text: 'Elemente pentru ambalaje industriale, livrate constant, pe paleți.' },
]

const elementCount = Object.values(crateElements).reduce((n, e) => n + e.count, 0)

const finishNames = finishes
  .filter((f) => f.id !== 'ispm15')
  .map((f) => f.name.toLowerCase())
  .join(' și ')

const process = [
  {
    title: 'Debitare',
    text: `Tăiem elementele la cotă din ${woodTypes.map((w) => w.name.toLowerCase()).join(', ')}: aceleași dimensiuni la fiecare lot.`,
  },
  { title: 'Prelucrare', text: `La cerere: ${finishNames}, pentru o suprafață curată la ambalare.` },
  { title: 'Tratament ISPM 15', text: 'Tratare termică și marcaj pentru ambalajele care pleacă la export.' },
  { title: 'Ambalare și livrare', text: 'Stivuite și legate pe paleți. Ridicare de la sediu sau livrare la adresa firmei.' },
]

export function AboutPage() {
  return (
    <>
      <PageHero
        title="Despre noi"
        aside={
          <HeroFacts
            items={[
              { label: 'Lucrăm cu', value: 'firme' },
              { label: 'Producție', value: 'în serie' },
              { label: 'Plata', value: 'transfer bancar' },
            ]}
          />
        }
      >
        Producem elemente din lemn pentru lădițe și ambalaje, pentru firme din România și pentru export.
      </PageHero>

      <section className="band">
        <div className="container two-col about-intro">
          <div className="prose reveal">
            <span className="eyebrow">Cine suntem</span>
            <h2>Producție de ambalaje din lemn, în serie</h2>
            <p>
              EUROVYPCUC S.R.L. produce elementele din care se montează lădițele de lemn: laterale, capete, scânduri de
              fund, traverse și montanți de colț, la bucată sau ca seturi complete.
            </p>
            <p>
              Lucrăm doar cu firme. Comenzile se fac pe paleți, prețurile sunt publicate pe site, iar factura proformă se
              emite pe loc. Producția începe după confirmarea plății.
            </p>
          </div>

          <div className="about-visual reveal">
            <figure className="about-shot is-main">
              <img src={crateImage} width={1080} height={630} alt="Lădiță montată din elementele EUROVYPCUC" loading="lazy" decoding="async" />
              <figcaption>Setul complet, montat: {elementCount} elemente</figcaption>
            </figure>
            <div className="about-note">
              <strong>ISPM 15</strong>
              <span>Tratament termic și marcaj pentru export, la cerere</span>
            </div>
            <figure className="about-shot">
              <img src={palletImage} width={1080} height={630} alt="Elemente stivuite și legate pe palet" loading="lazy" decoding="async" />
              <figcaption>Livrare pe paleți</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="band band-alt">
        <div className="container">
          <SectionHead eyebrow="Producție" title="Cum lucrăm" text="De la scândura brută la paletul gata de livrare." />
          <Steps items={process} />
        </div>
      </section>

      <section className="band band-alt">
        <div className="container">
          <SectionHead eyebrow="Clienți" title="Pentru cine lucrăm" />
          <div className="feature-grid three">
            {clients.map(({ icon: Icon, ...c }) => (
              <div key={c.title} className="feature reveal">
                <span className="icon-tile">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container">
          <div className="cta-inner reveal">
            <div>
              <h2>Gata să comandați?</h2>
              <p>Configurați comanda și primiți factura proformă în câteva minute.</p>
            </div>
            <a className="btn btn-lg btn-light btn-icon" href={href('comanda')}>
              Comandă online
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

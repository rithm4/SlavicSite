import { ArrowRight } from 'lucide-react'
import { PageHero } from '../components/site/PageHero'
import { href, type Route } from '../lib/useRoute'

const links: { route: Route; title: string; text: string }[] = [
  { route: 'produse', title: 'Produse și prețuri', text: 'Catalogul standard și elementele la comandă.' },
  { route: 'comanda', title: 'Comandă online', text: 'Prețul și factura proformă, în câteva minute.' },
  { route: 'contacte', title: 'Contacte', text: 'Telefon, e-mail, adresă și date de facturare.' },
]

/** Pentru o adresă greșită (ex. un link vechi): explică și oferă drumuri mai departe. */
export function NotFoundPage() {
  return (
    <>
      <PageHero title="Pagina nu există">
        Linkul e greșit sau pagina a fost mutată. Puteți continua de aici:
      </PageHero>
      <section className="band">
        <div className="container">
          <ul className="link-cards">
            {links.map((l) => (
              <li key={l.route}>
                <a href={href(l.route)}>
                  <strong>{l.title}</strong>
                  <span>{l.text}</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

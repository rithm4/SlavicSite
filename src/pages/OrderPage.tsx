import { Factory, Landmark, Phone } from 'lucide-react'
import { OrderWizard } from '../components/OrderWizard'
import { PageHero } from '../components/site/PageHero'
import { company } from '../config/company'

export function OrderPage() {
  return (
    <>
      <PageHero
        title="Comandă online"
        compact
        aside={
          <ul className="order-assure">
            <li>
              <Phone size={17} aria-hidden="true" />
              <span>
                Ajutor la comandă:{' '}
                <a href={`tel:${company.phone.replace(/\s/g, '')}`}>
                  <strong>{company.phone}</strong>
                </a>
              </span>
            </li>
            <li>
              <Landmark size={17} aria-hidden="true" />
              <span>Plata prin transfer bancar</span>
            </li>
            <li>
              <Factory size={17} aria-hidden="true" />
              <span>Producția începe după plată</span>
            </li>
          </ul>
        }
      >
        Configurați comanda în câțiva pași și primiți imediat factura proformă în PDF.
      </PageHero>
      <section className="band work-band">
        <div className="container">
          <OrderWizard />
        </div>
      </section>
    </>
  )
}

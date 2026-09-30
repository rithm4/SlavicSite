import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { ContactForm } from '../components/site/ContactForm'
import { CopyButton } from '../components/site/CopyButton'
import { PageHero } from '../components/site/PageHero'
import { company } from '../config/company'

export function ContactPage() {
  const tel = company.phone.replace(/\s/g, '')
  const weekdays = company.hours[0]
  const requisites: { label: string; value: string; copy?: boolean }[] = [
    { label: 'Denumire', value: company.name },
    { label: 'CUI', value: company.cui, copy: true },
    { label: 'Reg. Com.', value: company.regCom, copy: true },
    { label: 'Banca', value: company.bank.name },
    { label: 'SWIFT', value: company.bank.code, copy: true },
    { label: 'IBAN', value: company.bank.iban, copy: true },
  ]
  return (
    <>
      <PageHero title="Contacte">
        Pentru comenzi folosiți formularul online. Pentru întrebări și oferte, sunați-ne sau scrieți-ne.
      </PageHero>

      <section className="band band-tight">
        <div className="container contact-grid">
          <a className="contact-card reveal" href={`tel:${tel}`}>
            <span className="contact-head">
              <Phone className="contact-icon" size={20} aria-hidden="true" />
              <span className="contact-label">Telefon</span>
            </span>
            <strong>{company.phone}</strong>
            <span className="contact-sub">
              {weekdays.days}, {weekdays.time}
            </span>
          </a>
          <a className="contact-card reveal" href={`mailto:${company.email}`}>
            <span className="contact-head">
              <Mail className="contact-icon" size={20} aria-hidden="true" />
              <span className="contact-label">E-mail</span>
            </span>
            <strong>{company.email}</strong>
            <span className="contact-sub">Oferte, documente și întrebări</span>
          </a>
          <div className="contact-card reveal">
            <span className="contact-head">
              <MapPin className="contact-icon" size={20} aria-hidden="true" />
              <span className="contact-label">Adresa</span>
            </span>
            <strong>{company.address}</strong>
            <span className="contact-sub">Aici se ridică comenzile</span>
          </div>
          <div className="contact-card reveal">
            <span className="contact-head">
              <Clock className="contact-icon" size={20} aria-hidden="true" />
              <span className="contact-label">Program</span>
            </span>
            <ul className="price-list">
              {company.hours.map((h) => (
                <li key={h.days}>
                  <span>{h.days}</span>
                  <span className="muted">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="container">
          <iframe
            className="map reveal"
            title={`Harta: ${company.address}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(company.mapQuery)}&z=${company.mapZoom}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="band band-alt">
        <div className="container contact-bottom">
          <ContactForm />

          <div className="requisites">
            <h2>Date de facturare</h2>
            <p className="muted">Pentru plata prin transfer bancar; apar și pe factura proformă.</p>
            <dl className="req-list">
              {requisites.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>
                    <span>{r.value}</span>
                    {r.copy && <CopyButton value={r.value} label={r.label} />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  )
}

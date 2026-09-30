import { Landmark, Mail, MapPin, Phone } from 'lucide-react'
import { company } from '../../config/company'
import { href, navItems } from '../../lib/useRoute'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo light />
          <p className="footer-lead">
            Elemente din lemn pentru lădițe și ambalaje, pentru producători, exportatori și fabrici din România.
          </p>
        </div>

        <div>
          <h2 className="footer-title">Navigare</h2>
          <ul>
            {navItems.map((item) => (
              <li key={item.route}>
                <a href={href(item.route)}>{item.label}</a>
              </li>
            ))}
            <li>
              <a href={href('comanda')}>Comandă online</a>
            </li>
            <li>
              <a href={href('cont')}>Contul firmei</a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="footer-title">Contacte</h2>
          <ul className="icon-list">
            <li>
              <Phone size={16} aria-hidden="true" />
              <a href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a>
            </li>
            <li>
              <Mail size={16} aria-hidden="true" />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </li>
            <li>
              <MapPin size={16} aria-hidden="true" />
              <span>{company.address}</span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="footer-title">Date firmă</h2>
          <ul className="icon-list">
            <li>
              <Landmark size={16} aria-hidden="true" />
              <span>
                {company.name}
                <br />
                CUI {company.cui}
                <br />
                Reg. Com. {company.regCom}
                <br />
                {company.bank.name}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {company.name}
        </span>
        <span className="footer-legal">
          <a href={href('confidentialitate')}>Politica de confidențialitate</a>
          <span>Prețurile de pe site sunt în EUR, fără TVA.</span>
        </span>
      </div>
    </footer>
  )
}

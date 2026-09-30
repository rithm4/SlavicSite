import { PageHero } from '../components/site/PageHero'
import { company } from '../config/company'

// ATENȚIE: schiță — textul final trebuie verificat de un jurist înainte de lansare
// (Regulamentul (UE) 2016/679 — GDPR; autoritatea de supraveghere în România: ANSPDCP).
// Data de mai jos se schimbă odată cu textul.
const UPDATED = '30.09.2026'

export function PrivacyPage() {
  return (
    <>
      <PageHero title="Politica de confidențialitate">
        Cum folosim datele pe care ni le transmiteți prin formularul de comandă, prin cont și prin pagina de contacte.
      </PageHero>

      <section className="band">
        <div className="container">
          <div className="prose legal">
            <p className="legal-updated">Ultima actualizare: {UPDATED}</p>

            <h2>Cine prelucrează datele</h2>
            <p>
              Operatorul datelor este {company.name}, CUI {company.cui}, {company.address}. Pentru orice întrebare
              despre datele dumneavoastră ne puteți scrie la {company.email}.
            </p>

            <h2>Ce date colectăm</h2>
            <p>
              Denumirea firmei, CUI-ul, adresa, numele persoanei de contact, telefonul și e-mailul, plus detaliile
              comenzii (produse, cantități, data și modul de livrare).
            </p>

            <h2>Contul firmei</h2>
            <p>
              Dacă vă creați un cont, păstrăm în plus adresa de e-mail pentru intrare, adresele de livrare salvate,
              istoricul comenzilor și documentele (facturi, certificate) pe care le încărcăm pentru dumneavoastră.
              Parola nu o vedem: se păstrează criptată. Datele stau pe servere din Uniunea Europeană.
            </p>

            <h2>Mesajele din pagina de contacte</h2>
            <p>
              Când ne scrieți, păstrăm numele, firma, telefonul sau e-mailul lăsat și textul mesajului, ca să vă putem
              răspunde. Le vede doar echipa noastră.
            </p>

            <h2>De ce le folosim</h2>
            <p>
              Pentru a emite factura proformă, a produce și livra comanda și a vă contacta în legătură cu ea. Nu folosim
              datele pentru publicitate și nu le vindem altor firme.
            </p>

            <h2>Cât timp le păstrăm</h2>
            <p>Cât timp este necesar pentru executarea comenzii și cât cer legile contabile și fiscale.</p>

            <h2>Drepturile dumneavoastră</h2>
            <p>
              Conform Regulamentului (UE) 2016/679 (GDPR), puteți cere acces la date, corectarea sau ștergerea lor și
              vă puteți opune prelucrării, scriindu-ne la {company.email}. Aveți și dreptul să depuneți o plângere la
              Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

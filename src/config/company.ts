// Datele firmei — apar pe factura proformă (PDF), în subsol și pe pagina de contacte.
// ATENȚIE: date de test, de înlocuit cu cele reale.
export const company = {
  name: 'EUROVYPCUC S.R.L.',
  /** codul fiscal; cu „RO” în față dacă firma e plătitoare de TVA */
  cui: 'RO00000000',
  /** numărul de înregistrare la Registrul Comerțului */
  regCom: 'J00/0000/0000',
  // adresa reală a firmei (codul poștal se poate adăuga înainte de „Satu Mare”)
  address: 'Str. Depozitelor nr. 58, Satu Mare, România',
  phone: '+40 700 000 000',
  email: 'comenzi@exemplu.ro',
  bank: {
    name: 'Banca Exemplu S.A.',
    /** cod SWIFT/BIC */
    code: 'EXMPROBU',
    iban: 'RO00EXMP0000000000000000',
  },
  /** cine semnează proforma */
  director: 'Nume Prenume',
  /** Ce arată harta de pe pagina de contacte. */
  mapQuery: 'Strada Depozitelor 58, Satu Mare, România',
  mapZoom: 16,
  /** Programul de lucru (provizoriu, de înlocuit cu cel real). */
  hours: [
    { days: 'Luni – Vineri', time: '08:00 – 17:00' },
    { days: 'Sâmbătă', time: '09:00 – 13:00' },
    { days: 'Duminică', time: 'Închis' },
  ],
}

export const currency = 'EUR'
/** Cota standard de TVA în România (21% din 1 august 2025). */
export const vatRate = 0.21
/** Câte zile e valabilă factura proformă de la emitere. */
export const invoiceValidityDays = 5
/** Prefixul numărului facturii proforme, ex. EV-2026-0001. */
export const invoicePrefix = 'EV'

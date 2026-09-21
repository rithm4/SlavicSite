// Rechizitele firmei — apar în antetul contului de plată (PDF).
// ATENȚIE: date de test, de înlocuit cu cele reale.
export const company = {
  name: 'SLAVIC LEMN S.R.L.',
  idno: '1000000000000',
  vatCode: '0000000',
  address: 'str. Exemplu 1, mun. Chișinău, MD-2000, Republica Moldova',
  phone: '+373 60 000 000',
  email: 'comenzi@exemplu.md',
  bank: {
    name: 'BC "Banca Exemplu" S.A.',
    code: 'BANKMD2X',
    iban: 'MD00XX000000000000000000',
  },
  director: 'Nume Prenume',
}

export const currency = 'EUR'
export const vatRate = 0.2
/** Câte zile e valabil contul de plată de la emitere. */
export const invoiceValidityDays = 5
/** Prefixul numărului de cont de plată, ex. SL-2026-0001. */
export const invoicePrefix = 'SL'

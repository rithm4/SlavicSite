// Regulile calendarului de livrare/ridicare.

export const calendarRules = {
  /** Zile lucrătoare minime până la data aleasă. */
  baseLeadDays: 3,
  /** Zile în plus dacă sunt elemente personalizate. */
  customLeadDays: 2,
  /** Zile în plus pentru comenzi mari (număr total de bucăți). */
  largeOrderPieces: 2000,
  largeOrderLeadDays: 3,
  /** Câte comenzi pot fi programate în aceeași zi. */
  maxOrdersPerDay: 3,
  /** Cât de departe în viitor se poate alege data. */
  maxMonthsAhead: 3,
}

// Zile nelucrătoare (format YYYY-MM-DD). De verificat anual.
export const holidays: string[] = [
  '2026-01-01', '2026-01-07', '2026-01-08', '2026-03-08',
  '2026-04-12', '2026-04-13', '2026-04-20', '2026-05-01',
  '2026-05-09', '2026-06-01', '2026-08-27', '2026-08-31',
  '2026-12-25',
  '2027-01-01', '2027-01-07', '2027-01-08', '2027-03-08',
  '2027-05-01', '2027-05-02', '2027-05-03', '2027-05-09',
  '2027-05-10', '2027-06-01', '2027-08-27', '2027-08-31',
  '2027-12-25',
]

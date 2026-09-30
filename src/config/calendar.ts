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

// Sărbătorile legale din România (Codul muncii, art. 139), format YYYY-MM-DD. De verificat anual:
// Paștele și Rusaliile (ortodoxe) se mută în fiecare an.
export const holidays: string[] = [
  // 2026: Paște 12 aprilie, Rusalii 31 mai
  '2026-01-01', '2026-01-02', '2026-01-06', '2026-01-07', '2026-01-24',
  '2026-04-10', '2026-04-12', '2026-04-13', '2026-05-01', '2026-05-31',
  '2026-06-01', '2026-08-15', '2026-11-30', '2026-12-01', '2026-12-25',
  '2026-12-26',
  // 2027: Paște 2 mai, Rusalii 20 iunie
  '2027-01-01', '2027-01-02', '2027-01-06', '2027-01-07', '2027-01-24',
  '2027-04-30', '2027-05-01', '2027-05-02', '2027-05-03', '2027-06-01',
  '2027-06-20', '2027-06-21', '2027-08-15', '2027-11-30', '2027-12-01',
  '2027-12-25', '2027-12-26',
]

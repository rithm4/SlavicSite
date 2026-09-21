import { addDays, addMonths, format, isWeekend, parseISO, startOfDay } from 'date-fns'
import { calendarRules, holidays } from '../config/calendar'
import type { OrderDraft } from './types'

export const toIsoDate = (d: Date) => format(d, 'yyyy-MM-dd')
export const fromIsoDate = (s: string) => parseISO(s)

export function isWorkingDay(d: Date): boolean {
  return !isWeekend(d) && !holidays.includes(toIsoDate(d))
}

/** Numărul de zile lucrătoare necesare pentru comanda curentă. */
export function leadDaysFor(draft: OrderDraft, totalPieces: number): number {
  let days = calendarRules.baseLeadDays
  if (draft.custom.length > 0) days += calendarRules.customLeadDays
  if (totalPieces >= calendarRules.largeOrderPieces) days += calendarRules.largeOrderLeadDays
  return days
}

/** Prima zi lucrătoare disponibilă după `leadDays` zile lucrătoare de la azi. */
export function earliestDate(leadDays: number, today = new Date()): Date {
  let d = startOfDay(today)
  let remaining = leadDays
  while (remaining > 0) {
    d = addDays(d, 1)
    if (isWorkingDay(d)) remaining--
  }
  return d
}

export function latestDate(today = new Date()): Date {
  return addMonths(startOfDay(today), calendarRules.maxMonthsAhead)
}

export function isFullyBooked(d: Date, booked: Record<string, number>): boolean {
  return (booked[toIsoDate(d)] ?? 0) >= calendarRules.maxOrdersPerDay
}

export const formatDateRo = (d: Date) => format(d, 'dd.MM.yyyy')

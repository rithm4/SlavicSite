const moneyFormatter = new Intl.NumberFormat('ro-MD', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatMoney = (n: number) => moneyFormatter.format(n)
export const formatQty = (n: number) => new Intl.NumberFormat('ro-MD').format(n)

// --- Suma în litere (ex. „o mie două sute cincizeci de euro, 40 cenți") ---

type Gender = 'm' | 'f'

const UNITS = ['', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă']
const TEENS = [
  'zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece',
  'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece',
]
const TENS = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci']

function unit(n: number, g: Gender): string {
  if (g === 'f' && n === 1) return 'una'
  if (g === 'f' && n === 2) return 'două'
  return UNITS[n]
}

function below1000(n: number, g: Gender): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h === 1) parts.push('o sută')
  else if (h === 2) parts.push('două sute')
  else if (h > 2) parts.push(`${UNITS[h]} sute`)

  if (rest >= 20) {
    const u = rest % 10
    parts.push(u ? `${TENS[Math.floor(rest / 10)]} și ${unit(u, g)}` : TENS[rest / 10])
  } else if (rest >= 10) {
    parts.push(rest === 12 && g === 'f' ? 'douăsprezece' : TEENS[rest - 10])
  } else if (rest > 0) {
    parts.push(unit(rest, g))
  }
  return parts.join(' ')
}

/** În română, după numerele ≥ 20 care nu se termină în 01–19 se adaugă „de". */
const needsDe = (n: number) => n >= 20 && (n % 100 === 0 || n % 100 >= 20)

function group(n: number, one: string, many: string): string {
  if (n === 1) return one
  return `${below1000(n, 'f')}${needsDe(n) ? ' de' : ''} ${many}`
}

export function amountInWords(amount: number): string {
  const units = Math.floor(amount + 1e-9)
  const cents = Math.round((amount - units) * 100)

  const millions = Math.floor(units / 1_000_000)
  const thousands = Math.floor((units % 1_000_000) / 1000)
  const rest = units % 1000

  const parts: string[] = []
  if (millions) parts.push(group(millions, 'un milion', 'milioane'))
  if (thousands) parts.push(group(thousands, 'o mie', 'mii'))
  if (rest) parts.push(below1000(rest, 'm'))

  let text: string
  if (units === 0) text = 'zero euro'
  else if (units === 1) text = 'un euro'
  else text = `${parts.join(' ')}${needsDe(units) ? ' de' : ''} euro`

  return `${text}, ${String(cents).padStart(2, '0')} cenți`
}

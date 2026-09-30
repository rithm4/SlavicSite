// Ilustrațiile avantajelor: randări fotorealiste din aceleași materiale ca lădița din primul ecran
// (se refac cu tools/art), cu detaliile animate desenate peste ele.
// Animațiile pornesc când cardul primește clasa `is-visible` (vezi useReveal).
import { ArrowDown } from 'lucide-react'
import boardImage from '../../assets/art/board.webp'
import palletImage from '../../assets/art/pallet.webp'
import palletStrappedImage from '../../assets/art/pallet-strapped.webp'
import crateSetImage from '../../assets/products/set-lada.webp'
import { company, currency, invoicePrefix, vatRate } from '../../config/company'
import { formatDateRo } from '../../lib/dates'
import { formatMoney, formatQty } from '../../lib/format'
import { computeQuote } from '../../lib/pricing'
import { boardPoints } from './art/points'

type Point = readonly [number, number]

function Photo({ src, className = '' }: { src: string; className?: string }) {
  return (
    <img className={`il-photo ${className}`} src={src} width={1080} height={630} alt="" loading="lazy" decoding="async" />
  )
}

/** Cotă paralelă cu muchia a–b, la distanța `offset` (semnul alege partea), cu linii de extensie și etichetă. */
function Dimension({ a, b, offset, label }: { a: Point; b: Point; offset: number; label: string }) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const nx = (-(b[1] - a[1]) / length) * Math.sign(offset)
  const ny = ((b[0] - a[0]) / length) * Math.sign(offset)
  const d = Math.abs(offset)
  const at = (p: Point, k: number) => `${(p[0] + nx * k).toFixed(1)} ${(p[1] + ny * k).toFixed(1)}`
  const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return (
    <>
      <path className="il-ext" d={`M${at(a, 3)} L${at(a, d + 4)} M${at(b, 3)} L${at(b, d + 4)}`} />
      <path className="il-dim" d={`M${at(a, d)} L${at(b, d)}`} />
      <text
        className="il-label"
        x={mid[0] + nx * (d + 9)}
        y={mid[1] + ny * (d + 9)}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </>
  )
}

/** Scândură cu cote: lungime, lățime, grosime. */
export function DimensionsArt() {
  const { bottomLeft, bottomRight, topLeft, endFront, endBack } = boardPoints
  const end: Point = [(endFront[0] + endBack[0]) / 2, (endFront[1] + endBack[1]) / 2]
  return (
    <div className="il">
      <Photo src={boardImage} />
      <svg className="il-over" viewBox="0 0 240 140" aria-hidden="true">
        <Dimension a={bottomLeft} b={bottomRight} offset={12} label="L" />
        <Dimension a={bottomLeft} b={topLeft} offset={-10} label="l" />
        <path className="il-dim" d={`M${end[0] + 2} ${end[1]} H${end[0] + 16}`} />
        <text className="il-label" x={end[0] + 21} y={end[1]} textAnchor="middle" dominantBaseline="middle">
          g
        </text>
      </svg>
    </div>
  )
}

/** Lădița montată din elementele setului. */
export function SetArt() {
  return (
    <div className="il">
      <Photo src={crateSetImage} />
    </div>
  )
}

/** Palet EUR cu scânduri stivuite; benzile se strâng când cardul apare. */
export function PalletArt() {
  return (
    <div className="il">
      <Photo src={palletImage} />
      <Photo src={palletStrappedImage} className="il-strapped" />
    </div>
  )
}

// O comandă obișnuită, calculată cu aceleași reguli ca în formularul de comandă
const sampleQuote = computeQuote({
  standard: { laterala: 2000, capat: 2000, fund: 3000 },
  custom: [],
  qtyUnit: 'piece',
  deliveryMethod: 'pickup',
  deliveryAddress: '',
  date: null,
  client: { type: 'pj', name: '', cui: '', regCom: '', contactPerson: '', phone: '', email: '', address: '', notes: '' },
})

/** Miniatura facturii proforme PDF, cu aceeași structură ca documentul generat. */
export function InvoiceArt() {
  const q = sampleQuote
  return (
    <div className="il il-doc" aria-hidden="true">
      <div className="doc">
        <div className="doc-head">
          <strong className="doc-brand">{company.name}</strong>
          <div className="doc-title">
            <strong>FACTURĂ PROFORMĂ</strong>
            nr. {invoicePrefix}-{new Date().getFullYear()}-0142
            <br />
            din {formatDateRo(new Date())}
          </div>
        </div>
        <div className="doc-row doc-th">
          <span>Denumire</span>
          <span>Cant.</span>
          <span>Suma</span>
        </div>
        {q.lines.map((line) => (
          <div className="doc-row" key={line.details}>
            <span>
              {line.description} <em>{line.details}</em>
            </span>
            <span>{formatQty(line.qty)}</span>
            <span>{formatMoney(line.total)}</span>
          </div>
        ))}
        {q.discount > 0 && (
          <div className="doc-sum">
            <span>Reducere volum {Math.round(q.discountPct * 100)}%</span>
            <span>−{formatMoney(q.discount)}</span>
          </div>
        )}
        <div className="doc-sum">
          <span>TVA {Math.round(vatRate * 100)}%</span>
          <span>{formatMoney(q.vat)}</span>
        </div>
        <div className="doc-total">
          <span>Total de plată</span>
          <strong>
            {formatMoney(q.total)} {currency}
          </strong>
        </div>
      </div>
      <span className="doc-badge">PDF</span>
      <span className="doc-download">
        <ArrowDown size={16} strokeWidth={2.4} />
      </span>
    </div>
  )
}

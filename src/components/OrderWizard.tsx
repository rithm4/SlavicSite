import { useEffect, useMemo, useState } from 'react'
import { currency } from '../config/company'
import { formatMoney } from '../lib/format'
import { earliestDate, latestDate, leadDaysFor } from '../lib/dates'
import { orderStore } from '../lib/orderStore'
import { computeQuote } from '../lib/pricing'
import type { OrderDraft, SavedOrder } from '../lib/types'
import { stepErrors } from '../lib/validation'
import { ClientStep } from './ClientStep'
import { QuoteSummary } from './QuoteSummary'
import { ReviewStep } from './ReviewStep'
import { ScheduleStep } from './ScheduleStep'
import { ProductsStep } from './ProductsStep'

const STEPS = ['Produse', 'Livrare și dată', 'Datele dvs.', 'Confirmare']
const DRAFT_KEY = 'slavic.draft'

const emptyDraft = (): OrderDraft => ({
  standard: {},
  custom: [],
  deliveryMethod: 'pickup',
  deliveryAddress: '',
  date: null,
  client: { type: 'pj', name: '', idno: '', contactPerson: '', phone: '', email: '', address: '', notes: '' },
})

function loadDraft(): OrderDraft {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) return { ...emptyDraft(), ...(JSON.parse(saved) as OrderDraft) }
  } catch {
    // ciorna salvată lipsește sau e coruptă — pornim de la zero
  }
  return emptyDraft()
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function OrderWizard() {
  const [draft, setDraft] = useState<OrderDraft>(loadDraft)
  const [step, setStep] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [booked, setBooked] = useState<Record<string, number>>({})
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle')
  const [result, setResult] = useState<{ order: SavedOrder; blob: Blob } | null>(null)

  const quote = useMemo(() => computeQuote(draft), [draft])
  const leadDays = leadDaysFor(draft, quote.totalPieces)
  const earliest = useMemo(() => earliestDate(leadDays), [leadDays])
  const latest = useMemo(() => latestDate(), [])
  const errors = stepErrors(step, draft, quote, { earliest, latest, booked })

  useEffect(() => {
    orderStore.getBookedCounts().then(setBooked)
  }, [result])

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // stocarea nu e disponibilă (mod privat) — ciorna pur și simplu nu se păstrează
    }
  }, [draft])

  const update = (patch: Partial<OrderDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const goTo = (target: number) => {
    // Înainte se poate merge doar dacă pașii intermediari sunt valizi.
    for (let s = step; s < target; s++) {
      if (stepErrors(s, draft, quote, { earliest, latest, booked }).length > 0) {
        setStep(s)
        setShowErrors(true)
        return
      }
    }
    setStep(target)
    setShowErrors(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generate = async () => {
    for (let s = 0; s < STEPS.length - 1; s++) {
      if (stepErrors(s, draft, quote, { earliest, latest, booked }).length > 0) {
        setStep(s)
        setShowErrors(true)
        return
      }
    }
    setStatus('working')
    try {
      const { renderInvoicePdf } = await import('../pdf/InvoiceDocument')
      const order = await orderStore.createOrder(draft, quote)
      const blob = await renderInvoicePdf(order)
      downloadBlob(blob, `Cont-de-plata-${order.number}.pdf`)
      setResult({ order, blob })
      setStatus('idle')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }

  const startOver = () => {
    setDraft(emptyDraft())
    setResult(null)
    setStep(0)
  }

  if (result) {
    const { order, blob } = result
    return (
      <section className="done">
        <div className="done-icon" aria-hidden="true">✓</div>
        <h2>Contul de plată nr. {order.number} a fost generat</h2>
        <p>
          Descărcarea a pornit automat. Producția începe după confirmarea plății. Vă vom contacta la{' '}
          <strong>{order.draft.client.phone}</strong>.
        </p>
        <div className="actions center">
          <button type="button" className="btn" onClick={() => downloadBlob(blob, `Cont-de-plata-${order.number}.pdf`)}>
            Descarcă din nou PDF
          </button>
          <button type="button" className="btn secondary" onClick={() => window.open(URL.createObjectURL(blob), '_blank')}>
            Deschide în browser
          </button>
          <button type="button" className="btn-link" onClick={startOver}>
            Comandă nouă
          </button>
        </div>
      </section>
    )
  }

  const stepProps = { draft, update, quote, showErrors }
  const isLast = step === STEPS.length - 1

  return (
    <div className="wizard">
      <ol className="stepper">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
            <button type="button" onClick={() => (i < step ? setStep(i) : goTo(i))} aria-current={i === step ? 'step' : undefined}>
              <span className="stepper-num">{i < step ? '✓' : i + 1}</span>
              <span className="stepper-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="wizard-body">
        <main className="wizard-main">
          {step === 0 && <ProductsStep {...stepProps} />}
          {step === 1 && (
            <ScheduleStep {...stepProps} earliest={earliest} latest={latest} leadDays={leadDays} booked={booked} />
          )}
          {step === 2 && <ClientStep {...stepProps} />}
          {step === 3 && <ReviewStep {...stepProps} />}

          {showErrors && errors.length > 0 && (
            <div className="error-box" role="alert">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
          {status === 'error' && (
            <div className="error-box" role="alert">
              <p>Nu am reușit să generăm PDF-ul. Încercați din nou.</p>
            </div>
          )}

          <div className="actions">
            {step > 0 && (
              <button type="button" className="btn secondary" onClick={() => setStep(step - 1)}>
                Înapoi
              </button>
            )}
            <div className="actions-total">
              <span className="muted">Total cu TVA</span>
              <strong>
                {formatMoney(quote.total)} {currency}
              </strong>
            </div>
            {isLast ? (
              <button type="button" className="btn" onClick={generate} disabled={status === 'working'}>
                {status === 'working' ? 'Se generează…' : 'Generează contul de plată (PDF)'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => goTo(step + 1)}>
                Continuă
              </button>
            )}
          </div>
        </main>

        {!isLast && <QuoteSummary quote={quote} />}
      </div>
    </div>
  )
}

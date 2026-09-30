import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, FileDown, RotateCcw, UserRound } from 'lucide-react'
import { addDays } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { calendarRules } from '../config/calendar'
import { standardProducts } from '../config/catalog'
import { currency, invoiceValidityDays } from '../config/company'
import { useAccount } from '../lib/account'
import { getBackend } from '../lib/backend'
import type { CompanyProfile, DeliveryAddress } from '../lib/backend/types'
import { downloadBlob } from '../lib/download'
import { DRAFT_KEY } from '../lib/draft'
import { hashParams, href } from '../lib/useRoute'
import { formatMoney, formatPallets } from '../lib/format'
import { earliestDate, formatDateRo, fromIsoDate, latestDate, leadDaysFor } from '../lib/dates'
import { computeQuote } from '../lib/pricing'
import type { ClientInfo, OrderDraft, SavedOrder } from '../lib/types'
import { scrollToY } from '../lib/smoothScroll'
import { stepErrors } from '../lib/validation'
import { ClientStep } from './ClientStep'
import { QuoteSummary } from './QuoteSummary'
import { ReviewStep } from './ReviewStep'
import { ScheduleStep } from './ScheduleStep'
import { ProductsStep } from './ProductsStep'
import { Steps } from './site/Steps'

// pe telefon se văd numele scurte
const STEPS = [
  { label: 'Produse', short: 'Produse' },
  { label: 'Livrare și dată', short: 'Livrare' },
  { label: 'Datele firmei', short: 'Firma' },
  { label: 'Confirmare', short: 'Confirmare' },
]
/** Pasul cu datele firmei: acolo erorile apar sub câmpuri, fără casetă separată. */
const CLIENT_STEP = 2

const emptyDraft = (): OrderDraft => ({
  standard: {},
  custom: [],
  qtyUnit: 'pallet',
  deliveryMethod: 'pickup',
  deliveryAddress: '',
  date: null,
  client: { type: 'pj', name: '', cui: '', regCom: '', contactPerson: '', phone: '', email: '', address: '', notes: '' },
})

function loadDraft(): OrderDraft {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      const draft = { ...emptyDraft(), ...(JSON.parse(saved) as OrderDraft) }
      // Comenzile se fac doar de firme (persoane juridice). Ciornele vechi aveau „idno” în loc de „cui”.
      const old = draft.client as Partial<ClientInfo> & { idno?: string }
      return { ...draft, client: { ...emptyDraft().client, ...old, cui: old.cui ?? old.idno ?? '', type: 'pj' } }
    }
  } catch {
    // ciorna salvată lipsește sau e coruptă — pornim de la zero
  }
  return emptyDraft()
}

/** Dacă s-a venit de pe cardul unui produs (#/comanda?produs=…), îl adaugă cu un palet sau cantitatea minimă. */
function withPreselected(draft: OrderDraft): OrderDraft {
  const product = standardProducts.find((p) => p.id === hashParams().get('produs'))
  if (!product || draft.standard[product.id]) return draft
  const qty = draft.qtyUnit === 'pallet' ? product.piecesPerPallet : product.minQty
  return { ...draft, standard: { ...draft.standard, [product.id]: qty } }
}

export function OrderWizard() {
  const { user, profile, backend } = useAccount()
  const [draft, setDraft] = useState<OrderDraft>(() => withPreselected(loadDraft()))
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([])
  const [step, setStep] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [booked, setBooked] = useState<Record<string, number>>({})
  const [status, setStatus] = useState<'idle' | 'working' | 'order-failed' | 'pdf-failed'>('idle')
  const [result, setResult] = useState<{ order: SavedOrder; blob: Blob } | null>(null)
  // comanda deja înregistrată, dacă doar PDF-ul a eșuat: la reîncercare nu se mai creează una nouă
  const [pending, setPending] = useState<{ order: SavedOrder; draft: OrderDraft } | null>(null)
  const [calendarUnknown, setCalendarUnknown] = useState(false)
  const wizardRef = useRef<HTMLDivElement>(null)
  const stepChanged = useRef(false)

  const quote = useMemo(() => computeQuote(draft), [draft])
  const leadDays = leadDaysFor(draft, quote.totalPieces)
  const earliest = useMemo(() => earliestDate(leadDays), [leadDays])
  const latest = useMemo(() => latestDate(), [])
  const errors = stepErrors(step, draft, quote, { earliest, latest, booked })

  // zilele pline și cele închise de echipă nu se pot alege în calendar
  useEffect(() => {
    getBackend()
      .then((b) => Promise.all([b.bookedCounts(), b.closedDays()]))
      .then(([counts, closed]) => {
        const full = Object.fromEntries(closed.map((c) => [c.day, calendarRules.maxOrdersPerDay]))
        setBooked({ ...counts, ...full })
        setCalendarUnknown(false)
      })
      .catch(() => {
        // fără răspuns de la server lăsăm orice zi lucrătoare, dar clientul află că data se confirmă
        setBooked({})
        setCalendarUnknown(true)
      })
  }, [result])

  // Din cont: datele firmei se completează singure, o dată, dacă formularul e gol.
  const [prefilledFrom, setPrefilledFrom] = useState<CompanyProfile | null>(null)
  if (profile && profile !== prefilledFrom) {
    setPrefilledFrom(profile)
    if (!draft.client.name.trim()) {
      const { name, cui, regCom, contactPerson, phone, email, address } = profile
      setDraft({ ...draft, client: { ...draft.client, name, cui, regCom, contactPerson, phone, email, address } })
    }
  }

  // Adresele salvate se aleg dintr-un clic; cea implicită intră singură în comandă.
  useEffect(() => {
    if (!user || !backend) return
    let cancelled = false
    backend
      .listAddresses()
      .then((list) => {
        if (cancelled) return
        setAddresses(list)
        const main = list.find((a) => a.isDefault)
        if (main) setDraft((d) => (d.deliveryAddress.trim() ? d : { ...d, deliveryAddress: main.address }))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user, backend])

  useEffect(() => {
    // Produsul din link e deja în ciornă — scoatem parametrul ca să nu fie readăugat la reîncărcare.
    if (hashParams().has('produs')) history.replaceState(null, '', '#/comanda')
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // stocarea nu e disponibilă (mod privat) — ciorna pur și simplu nu se păstrează
    }
  }, [draft])

  const update = (patch: Partial<OrderDraft>) => setDraft((d) => ({ ...d, ...patch }))

  // la alt pas: sus la începutul formularului (nu al paginii), cu focusul pe titlul pasului
  useEffect(() => {
    if (!stepChanged.current) return
    stepChanged.current = false
    const wizard = wizardRef.current
    if (!wizard) return
    const top = wizard.getBoundingClientRect().top + window.scrollY - 88
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (window.scrollY > top) scrollToY(top, !still)
    const title = wizard.querySelector<HTMLElement>('.wizard-main h2')
    if (title) {
      title.tabIndex = -1
      title.focus({ preventScroll: true })
    }
  }, [step])

  const showStep = (target: number) => {
    stepChanged.current = target !== step
    setStep(target)
  }

  // după o încercare nereușită de a merge mai departe: la prima greșeală (câmpul sau caseta cu erori)
  const [errorPing, setErrorPing] = useState(0)
  useEffect(() => {
    if (!errorPing) return
    const frame = requestAnimationFrame(() => {
      const main = wizardRef.current?.querySelector('.wizard-main')
      const target =
        main?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? main?.querySelector<HTMLElement>('.error-box')
      if (!target) return
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scrollToY(target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3, !still)
      if (target.matches('input, textarea, select')) target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [errorPing])
  const failAt = (s: number) => {
    showStep(s)
    setShowErrors(true)
    setErrorPing((n) => n + 1)
  }

  const goTo = (target: number) => {
    // Înainte se poate merge doar dacă pașii intermediari sunt valizi.
    for (let s = step; s < target; s++) {
      if (stepErrors(s, draft, quote, { earliest, latest, booked }).length > 0) {
        failAt(s)
        return
      }
    }
    showStep(target)
    setShowErrors(false)
  }

  const generate = async () => {
    for (let s = 0; s < STEPS.length - 1; s++) {
      if (stepErrors(s, draft, quote, { earliest, latest, booked }).length > 0) {
        failAt(s)
        return
      }
    }
    setStatus('working')
    let order: SavedOrder
    try {
      order = pending && pending.draft === draft ? pending.order : await (await getBackend()).createOrder(draft, quote)
      setPending({ order, draft })
    } catch (e) {
      console.error(e)
      setStatus('order-failed')
      return
    }
    try {
      const { renderInvoicePdf } = await import('../pdf/InvoiceDocument')
      const blob = await renderInvoicePdf(order)
      downloadBlob(blob, `Factura-proforma-${order.number}.pdf`)
      setResult({ order, blob })
      setPending(null)
      setStatus('idle')
    } catch (e) {
      console.error(e)
      setStatus('pdf-failed')
    }
  }

  const openPdf = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const startOver = () => {
    setDraft(emptyDraft())
    setResult(null)
    setPending(null)
    setStep(0)
  }

  if (result) {
    const { order, blob } = result
    const done = order.draft
    const delivery = done.deliveryMethod === 'delivery'
    const when = done.date ? formatDateRo(fromIsoDate(done.date)) : '—'
    const validUntil = formatDateRo(addDays(new Date(order.issuedAt), invoiceValidityDays))
    return (
      <section className="done">
        <div className="done-icon" aria-hidden="true">
          <Check size={26} />
        </div>
        <h2>
          Factura proformă nr. <span className="nowrap">{order.number}</span> a fost generată
        </h2>
        <p>Descărcarea PDF-ului a pornit automat.</p>

        <dl className="done-summary">
          <div>
            <dt>Total de plată</dt>
            <dd>
              {formatMoney(order.quote.total)} {currency}
            </dd>
          </div>
          <div>
            <dt>{delivery ? 'Livrare' : 'Ridicare'}</dt>
            <dd>{when}</dd>
          </div>
          <div>
            <dt>Volum</dt>
            <dd>≈ {formatPallets(order.quote.totalPallets)}</dd>
          </div>
          <div>
            <dt>Proforma e valabilă până la</dt>
            <dd>{validUntil}</dd>
          </div>
        </dl>

        <div className="done-next">
          <h3>Ce urmează</h3>
          <Steps
            items={[
              { title: 'Plătiți proforma', text: `Prin transfer bancar, cu „${order.number}” la detalii plată.` },
              { title: 'Pornim producția', text: `Imediat ce primim plata. Vă contactăm la ${done.client.phone}.` },
              delivery
                ? { title: 'Livrăm comanda', text: `Pe ${when}, la ${done.deliveryAddress}.` }
                : { title: 'Ridicați comanda', text: `Pe ${when}, de la sediul nostru.` },
            ]}
          />
        </div>

        <div className="actions center">
          <button type="button" className="btn btn-icon" onClick={() => downloadBlob(blob, `Factura-proforma-${order.number}.pdf`)}>
            <Download size={18} aria-hidden="true" />
            Descarcă din nou PDF
          </button>
          <button type="button" className="btn secondary btn-icon" onClick={() => openPdf(blob)}>
            <ExternalLink size={18} aria-hidden="true" />
            Deschide în browser
          </button>
          <button type="button" className="btn-link btn-icon" onClick={startOver}>
            <RotateCcw size={16} aria-hidden="true" />
            Comandă nouă
          </button>
        </div>
        {user ? (
          <p className="done-account">
            Comanda e salvată în cont, unde îi puteți urmări statusul.{' '}
            <a href="#/cont?sectiune=comenzi">Vezi comanda în cabinet</a>
          </p>
        ) : (
          <p className="done-account">
            <UserRound size={16} aria-hidden="true" />
            Cu un cont de firmă vedeți statusul comenzilor și găsiți facturile la un loc.{' '}
            <a href={`${href('cont')}?nou=1`}>Creați un cont</a>
          </p>
        )}
      </section>
    )
  }

  const stepProps = { draft, update, quote, showErrors }
  const isLast = step === STEPS.length - 1

  return (
    <div className="wizard" ref={wizardRef}>
      <ol className="stepper">
        {STEPS.map(({ label, short }, i) => (
          <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
            <button
              type="button"
              aria-label={label}
              onClick={() => (i < step ? showStep(i) : goTo(i))}
              aria-current={i === step ? 'step' : undefined}
            >
              <span className="stepper-num">{i < step ? '✓' : i + 1}</span>
              <span className="stepper-label" aria-hidden="true">
                <span className="stepper-long">{label}</span>
                <span className="stepper-short">{short}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="wizard-body">
        <div className="wizard-main">
          {step === 0 && <ProductsStep {...stepProps} />}
          {step === 1 && (
            <ScheduleStep
              {...stepProps}
              earliest={earliest}
              latest={latest}
              leadDays={leadDays}
              booked={booked}
              bookedUnknown={calendarUnknown}
              savedAddresses={user ? addresses : []}
            />
          )}
          {step === 2 && <ClientStep {...stepProps} fromAccount={!!profile} />}
          {step === 3 && <ReviewStep {...stepProps} />}

          {showErrors && errors.length > 0 && step !== CLIENT_STEP && (
            <div className="error-box" role="alert">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
          {status === 'order-failed' && (
            <div className="error-box" role="alert">
              <p>Nu am reușit să înregistrăm comanda. Verificați conexiunea la internet și încercați din nou.</p>
            </div>
          )}
          {status === 'pdf-failed' && pending && (
            <div className="error-box" role="alert">
              <p>
                Comanda {pending.order.number} e înregistrată, dar PDF-ul nu s-a generat. Apăsați din nou butonul: nu se
                creează o comandă nouă.
              </p>
            </div>
          )}

          <div className="actions">
            {step > 0 && (
              <button type="button" className="btn secondary btn-icon" onClick={() => showStep(step - 1)}>
                <ArrowLeft size={18} aria-hidden="true" />
                Înapoi
              </button>
            )}
            <div className="actions-total">
              <span className="muted">
                {quote.totalPallets > 0 && `${formatPallets(quote.totalPallets)} · `}Total cu TVA
              </span>
              <strong>
                {formatMoney(quote.total)} {currency}
              </strong>
            </div>
            {isLast ? (
              <button type="button" className="btn btn-icon" onClick={generate} disabled={status === 'working'}>
                <FileDown size={18} aria-hidden="true" />
                {status === 'working' ? 'Se generează…' : 'Generează factura proformă'}
              </button>
            ) : (
              <button type="button" className="btn btn-icon" onClick={() => goTo(step + 1)}>
                Continuă
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {!isLast && <QuoteSummary quote={quote} />}
      </div>
    </div>
  )
}

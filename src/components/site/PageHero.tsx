import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { href } from '../../lib/useRoute'

interface Props {
  title: string
  children?: ReactNode
  /** Antet scund, pentru paginile de lucru (comandă, cabinet, panou admin): conținutul începe aproape de sus. */
  compact?: boolean
  /** Conținut în dreapta titlului (ex. câteva repere scurte). */
  aside?: ReactNode
}

/** Antetul paginilor interioare: cale de navigare, titlu, descriere și, opțional, repere în dreapta. */
export function PageHero({ title, children, compact = false, aside }: Props) {
  return (
    <section className={compact ? 'page-hero is-compact' : 'page-hero'}>
      <div className="container">
        <nav className="breadcrumb" aria-label="Cale de navigare">
          <a href={href('acasa')}>Acasă</a>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </nav>
        <div className={aside ? 'page-hero-row has-aside' : 'page-hero-row'}>
          <div className="page-hero-text">
            <h1>{title}</h1>
            {children && <p>{children}</p>}
          </div>
          {aside && <div className="page-hero-aside">{aside}</div>}
        </div>
      </div>
    </section>
  )
}

/** Repere scurte în antet: etichetă mică și valoare. */
export function HeroFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="hero-facts">
      {items.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

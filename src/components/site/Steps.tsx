import type { CSSProperties } from 'react'

/** Pași legați printr-o linie: pe orizontală pe ecran mare, pe verticală pe telefon. */
export function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="steps" style={{ '--steps': items.length } as CSSProperties}>
      {items.map((s, i) => (
        <li key={s.title} className="reveal">
          <span className="steps-num" aria-hidden="true">
            {i + 1}
          </span>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </li>
      ))}
    </ol>
  )
}

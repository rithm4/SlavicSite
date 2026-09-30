import type { ReactNode } from 'react'

interface Props {
  eyebrow?: string
  title: string
  text?: ReactNode
  /** Link sau buton afișat în dreapta titlului. */
  action?: ReactNode
}

export function SectionHead({ eyebrow, title, text, action }: Props) {
  return (
    <div className={action ? 'section-head row reveal' : 'section-head reveal'}>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {text && <p className="muted">{text}</p>}
      </div>
      {action}
    </div>
  )
}

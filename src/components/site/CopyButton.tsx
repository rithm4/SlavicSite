import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Copiază o valoare (IBAN, CUI) dintr-un clic, cu confirmare scurtă. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // fără acces la clipboard (browser vechi, pagină fără https): valoarea rămâne de selectat manual
    }
  }

  return (
    <button type="button" className={copied ? 'copy-btn is-copied' : 'copy-btn'} onClick={() => void copy()}>
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      <span className="sr-only">
        {copied ? 'Copiat' : 'Copiază'} {label}
      </span>
      <span className="copy-btn-text" aria-hidden="true">
        {copied ? 'Copiat' : 'Copiază'}
      </span>
    </button>
  )
}

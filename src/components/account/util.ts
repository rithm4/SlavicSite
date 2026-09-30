import { documentKinds } from '../../lib/backend/types'
import type { Backend, DocumentRecord } from '../../lib/backend/types'
import { formatDateRo } from '../../lib/dates'

export const kindLabel = (kind: string) => documentKinds.find((k) => k.id === kind)?.label ?? kind

/** Deschide un document încărcat de firmă (factură, certificat), printr-o adresă temporară. */
export async function openDocument(backend: Backend, document: DocumentRecord) {
  const url = await backend.documentUrl(document)
  const a = window.document.createElement('a')
  a.href = url
  a.download = document.fileName
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
}

export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

export const dateOf = (iso: string) => formatDateRo(new Date(iso))

export const errorText = (e: unknown) => (e instanceof Error ? e.message : 'A apărut o eroare. Încercați din nou.')

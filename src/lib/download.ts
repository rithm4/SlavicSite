import type { SavedOrder } from './types'

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Refacerea facturii proforme din datele comenzii salvate (același PDF ca la emitere). */
export async function downloadInvoice(order: SavedOrder) {
  const { renderInvoicePdf } = await import('../pdf/InvoiceDocument')
  downloadBlob(await renderInvoicePdf(order), `Factura-proforma-${order.number}.pdf`)
}

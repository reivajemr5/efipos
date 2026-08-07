import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ItemRow {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface DocData {
  title: string
  number: string
  clientName?: string
  date?: string
  items: ItemRow[]
  subtotal: number
  ivaTotal: number
  total: number
  currency: string
  paymentMethod?: string
}

const COMPANY = {
  name: 'Efi- Pos',
  rif: 'J-12345678-9',
  address: 'Av. Principal, Local 1',
  phone: '0412-1234567',
}

const symbol = (c: string) => (c === 'usd' ? '$' : 'Bs.')

export function downloadPdf(data: DocData) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 160] })

  doc.setFontSize(13)
  doc.text(COMPANY.name, 40, 18, { align: 'center' })
  doc.setFontSize(8)
  doc.text(`RIF: ${COMPANY.rif}`, 40, 26, { align: 'center' })
  doc.text(COMPANY.address, 40, 31, { align: 'center' })
  doc.text(`Tel: ${COMPANY.phone}`, 40, 36, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`${data.title}: ${data.number}`, 40, 46, { align: 'center' })
  if (data.date) {
    doc.setFontSize(8)
    doc.text(data.date, 40, 52, { align: 'center' })
  }

  let y = 58
  if (data.clientName) {
    doc.setFontSize(8)
    doc.text(`Cliente: ${data.clientName}`, 8, y)
    y += 8
  }

  autoTable(doc, {
    startY: y,
    head: [['Producto', 'Cant', 'Total']],
    body: data.items.map((i) => [
      i.name,
      String(i.quantity),
      `${symbol(data.currency)}${i.subtotal.toFixed(2)}`,
    ]),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 8
  doc.setFontSize(9)
  doc.text(`Subtotal: ${symbol(data.currency)}${data.subtotal.toFixed(2)}`, 40, finalY, { align: 'right' })
  doc.text(`IVA: ${symbol(data.currency)}${data.ivaTotal.toFixed(2)}`, 40, finalY + 10, { align: 'right' })
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text(`Total: ${symbol(data.currency)}${data.total.toFixed(2)}`, 40, finalY + 22, { align: 'right' })
  if (data.paymentMethod) {
    doc.setFontSize(8)
    doc.text(`Forma de pago: ${data.paymentMethod}`, 40, finalY + 34, { align: 'center' })
  }

  const sanitized = data.number.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
  doc.save(`${data.title.replace(/\s+/g, '-').toLowerCase()}-${sanitized}.pdf`)
}
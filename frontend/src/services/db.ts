import Dexie, { type Table } from 'dexie'

export interface OfflineProduct {
  id: number
  code: string
  name: string
  price: number
  ivaPercent: number
  stock: number
  minStock: number
  supplierId: number | null
  supplierName: string | null
  updatedAt: string
}

export interface OfflineClient {
  id: number
  name: string
  documentType: string
  documentNumber: string
  phone: string | null
  updatedAt: string
}

export interface OfflineSupplier {
  id: number
  name: string
  documentType: string
  documentNumber: string
  phone: string | null
  updatedAt: string
}

export interface OfflineInvoice {
  id?: number
  localId: string
  clientId: number
  clientName: string
  paymentMethod: string
  currency: string
  exchangeRate: number | null
  items: { productId: number; productName: string; quantity: number; unitPrice: number; ivaPercent: number; subtotal: number }[]
  subtotal: number
  ivaTotal: number
  total: number
  createdAt: string
  synced: boolean
}

export interface PendingChange {
  id?: number
  entity: string
  action: 'create' | 'update' | 'delete'
  payload: any
  localId?: string
  createdAt: string
  retries: number
}

class EfiPosDB extends Dexie {
  products!: Table<OfflineProduct>
  clients!: Table<OfflineClient>
  suppliers!: Table<OfflineSupplier>
  offlineInvoices!: Table<OfflineInvoice>
  pendingChanges!: Table<PendingChange>

  constructor() {
    super('efipos-db')
    this.version(1).stores({
      products: 'id, code, name, updatedAt',
      clients: 'id, name, documentNumber, updatedAt',
      suppliers: 'id, name, updatedAt',
      offlineInvoices: '++id, localId, createdAt, synced',
      pendingChanges: '++id, entity, action, createdAt',
    })
  }
}

export const db = new EfiPosDB()

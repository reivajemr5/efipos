import { api } from './api'
import { db } from './db'

export async function syncCatalogs() {
  try {
    const [products, clients, suppliers] = await Promise.all([
      api.products.list(),
      api.clients.list(),
      api.suppliers.list(),
    ])

    const now = new Date().toISOString()
    await db.products.clear()
    await db.clients.clear()
    await db.suppliers.clear()

    await db.products.bulkAdd(
      products.map((p: any) => ({
        id: p.id, code: p.code, name: p.name,
        price: Number(p.price), ivaPercent: Number(p.ivaPercent),
        stock: p.stock, minStock: p.minStock,
        supplierId: p.supplierId, supplierName: p.supplier?.name || null,
        updatedAt: now,
      }))
    )
    await db.clients.bulkAdd(
      clients.map((c: any) => ({
        id: c.id, name: c.name,
        documentType: c.documentType, documentNumber: c.documentNumber,
        phone: c.phone, updatedAt: now,
      }))
    )
    await db.suppliers.bulkAdd(
      suppliers.map((s: any) => ({
        id: s.id, name: s.name,
        documentType: s.documentType, documentNumber: s.documentNumber,
        phone: s.phone, updatedAt: now,
      }))
    )
  } catch {
    // offline, use cached data
  }
}

const BACKOFF_BASE_MS = 1000
const MAX_RETRIES = 5

function inBackoff(change: any): boolean {
  if (!change.lastAttempt) return false
  const delay = BACKOFF_BASE_MS * Math.pow(2, Math.min(change.retries || 0, 6))
  return Date.now() - new Date(change.lastAttempt).getTime() < delay
}

async function processCatalogChange(change: any): Promise<boolean> {
  const { action, payload, entity } = change
  const id = payload?.id
  try {
    if (entity === 'client') {
      if (action === 'delete') await api.clients.delete(id)
      else if (action === 'update') await api.clients.update(id, payload)
      else await api.clients.create(payload)
    } else if (entity === 'product') {
      if (action === 'delete') await api.products.delete(id)
      else if (action === 'update') await api.products.update(id, payload)
      else await api.products.create(payload)
    } else if (entity === 'supplier') {
      if (action === 'delete') await api.suppliers.delete(id)
      else if (action === 'update') await api.suppliers.update(id, payload)
      else await api.suppliers.create(payload)
    } else {
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function processPendingChanges() {
  const offlineInvoices = (await db.offlineInvoices.toArray()).filter((i) => !i.synced)

  for (const inv of offlineInvoices) {
    try {
      await api.invoices.create({
        clientId: inv.clientId,
        paymentMethod: inv.paymentMethod,
        currency: inv.currency,
        exchangeRate: inv.exchangeRate || undefined,
        items: inv.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      })
      await db.offlineInvoices.update(inv.id!, { synced: true })
    } catch {
      console.log('[sync] Error sincronizando factura, reintentará después')
    }
  }

  const changes = await db.pendingChanges.orderBy('createdAt').toArray()
  for (const change of changes) {
    if (inBackoff(change)) continue

    let ok: boolean
    if (change.entity === 'invoice') {
      ok = change.action === 'create'
        ? await api.invoices.create(change.payload).then(() => true).catch(() => false)
        : false
    } else if (change.entity === 'quote') {
      ok = change.action === 'create'
        ? await api.quotes.create(change.payload).then(() => true).catch(() => false)
        : false
    } else {
      ok = await processCatalogChange(change)
    }

    if (ok) {
      await db.pendingChanges.delete(change.id!)
    } else {
      const retries = (change.retries || 0) + 1
      if (retries >= MAX_RETRIES) {
        await db.pendingChanges.delete(change.id!)
        console.log(`[sync] Descartado ${change.entity}/${change.action} tras ${MAX_RETRIES} intentos`)
      } else {
        await db.pendingChanges.update(change.id!, {
          retries,
          lastAttempt: new Date().toISOString(),
        })
      }
    }
  }
}

export async function queueChange(entity: string, action: 'create' | 'update' | 'delete', payload: any) {
  await db.pendingChanges.add({
    entity,
    action,
    payload: { ...payload },
    localId: payload?.localId || (payload?.id != null ? payload.id.toString() : undefined),
    createdAt: new Date().toISOString(),
    retries: 0,
  })
}

export async function getPendingCount(): Promise<number> {
  const pending = await db.pendingChanges.count()
  const offline = (await db.offlineInvoices.toArray()).filter((i) => !i.synced).length
  return pending + offline
}
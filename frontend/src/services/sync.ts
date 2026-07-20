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

export async function processPendingChanges() {
  const offlineInvoices = (await db.offlineInvoices.toArray()).filter((i) => !i.synced)

  for (const inv of offlineInvoices) {
    try {
      await api.invoices.create({
        clientId: inv.clientId,
        paymentMethod: inv.paymentMethod,
        items: inv.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      })
      await db.offlineInvoices.update(inv.id!, { synced: true })
    } catch {
      console.log('[sync] Error syncing invoice, will retry later')
    }
  }

  const changes = await db.pendingChanges.orderBy('createdAt').toArray()
  for (const change of changes) {
    try {
      switch (change.entity) {
        case 'invoice':
          change.action === 'create' && await api.invoices.create(change.payload)
          break
        case 'quote':
          change.action === 'create' && await api.quotes.create(change.payload)
          break
      }
      await db.pendingChanges.delete(change.id!)
    } catch {
      const retries = (change.retries || 0) + 1
      if (retries >= 5) {
        await db.pendingChanges.delete(change.id!)
      } else {
        await db.pendingChanges.update(change.id!, { retries })
      }
    }
  }
}

export async function queueChange(entity: string, action: 'create' | 'update' | 'delete', payload: any) {
  if (navigator.onLine) return
  await db.pendingChanges.add({
    entity, action, payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  })
}

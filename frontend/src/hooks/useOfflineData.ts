import { useEffect, useState } from 'react'
import { db, type OfflineProduct, type OfflineClient, type OfflineSupplier } from '../services/db'
import { api } from '../services/api'

export function useOfflineProducts() {
  const [products, setProducts] = useState<OfflineProduct[]>([])

  useEffect(() => {
    async function load() {
      try {
        const data = await api.products.list()
        const mapped = data.map((p: any) => ({
          id: p.id, code: p.code, name: p.name,
          price: Number(p.price), ivaPercent: Number(p.ivaPercent),
          stock: p.stock, minStock: p.minStock,
          supplierId: p.supplierId, supplierName: p.supplier?.name || null,
          decimalQuantity: !!p.decimalQuantity,
          sellWithoutStock: !!p.sellWithoutStock,
          priceOverride: !!p.priceOverride,
          updatedAt: new Date().toISOString(),
        }))
        setProducts(mapped)
        await db.products.clear()
        await db.products.bulkAdd(mapped)
      } catch {
        const cached = await db.products.toArray()
        setProducts(cached)
      }
    }
    load()
  }, [])

  return products
}

export function useOfflineClients() {
  const [clients, setClients] = useState<OfflineClient[]>([])

  useEffect(() => {
    async function load() {
      try {
        const data = await api.clients.list()
        const mapped = data.map((c: any) => ({
          id: c.id, name: c.name,
          documentType: c.documentType, documentNumber: c.documentNumber,
          phone: c.phone, updatedAt: new Date().toISOString(),
        }))
        setClients(mapped)
        await db.clients.clear()
        await db.clients.bulkAdd(mapped)
      } catch {
        const cached = await db.clients.toArray()
        setClients(cached)
      }
    }
    load()
  }, [])

  return clients
}

export function useOfflineSuppliers() {
  const [suppliers, setSuppliers] = useState<OfflineSupplier[]>([])

  useEffect(() => {
    async function load() {
      try {
        const data = await api.suppliers.list()
        const mapped = data.map((s: any) => ({
          id: s.id, name: s.name,
          documentType: s.documentType, documentNumber: s.documentNumber,
          phone: s.phone, updatedAt: new Date().toISOString(),
        }))
        setSuppliers(mapped)
        await db.suppliers.clear()
        await db.suppliers.bulkAdd(mapped)
      } catch {
        const cached = await db.suppliers.toArray()
        setSuppliers(cached)
      }
    }
    load()
  }, [])

  return suppliers
}

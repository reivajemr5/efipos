import { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient | typeof import('../lib/prisma').default

export interface ChangeStockOptions {
  businessId: number
  branchId: number
  productId: number
  type: string
  /** signed delta (positive adds, negative removes) unless `adjustment` */
  quantity: number
  notes?: string
  reference?: string
  userId?: number | null
  minStock?: number
}

export interface StockResult {
  before: number
  after: number
}

/**
 * Adjusts the per-branch stock of a product and records a StockMovement.
 * type === 'adjustment' treats `quantity` as the absolute target stock.
 */
export async function changeStock(tx: Tx, opts: ChangeStockOptions): Promise<StockResult> {
  const cur = await tx.branchStock.findUnique({
    where: { branchId_productId: { branchId: opts.branchId, productId: opts.productId } },
  })
  const current = cur ? Number(cur.stock) : 0
  const next = opts.type === 'adjustment' ? opts.quantity : current + opts.quantity
  const after = Math.max(0, next)

  await tx.branchStock.upsert({
    where: { branchId_productId: { branchId: opts.branchId, productId: opts.productId } },
    create: {
      branchId: opts.branchId,
      productId: opts.productId,
      stock: after,
      minStock: opts.minStock ?? 5,
    },
    update: { stock: after },
  })

  await tx.stockMovement.create({
    data: {
      businessId: opts.businessId,
      branchId: opts.branchId,
      productId: opts.productId,
      type: opts.type,
      quantity: opts.type === 'adjustment' ? next - current : opts.quantity,
      stockBefore: current,
      stockAfter: after,
      reference: opts.reference ?? null,
      notes: opts.notes ?? null,
      userId: opts.userId ?? null,
    },
  })

  return { before: current, after }
}

/** Reads the per-branch stock for a product (0 when not initialized yet). */
export async function readStock(tx: Tx, branchId: number, productId: number): Promise<number> {
  const cur = await tx.branchStock.findUnique({
    where: { branchId_productId: { branchId, productId } },
  })
  return cur ? Number(cur.stock) : 0
}

/** Product include that returns a branch-scoped `stock` for the active branch. */
export function stockInclude(branchId: number | null) {
  if (!branchId) return { stocks: false as const }
  return {
    stocks: { where: { branchId }, select: { stock: true, minStock: true } },
  }
}

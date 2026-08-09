import { AuthRequest } from '../middleware/auth'
import prisma from './prisma'

export interface TenantContext {
  businessId: number | null
  branchId: number | null
}

/**
 * Resolves the tenant scope (business + branch) for the current request.
 * - superadmin: picks business/branch from query params (operates across tenants).
 * - dueno: locked to their business; can switch branch within it via query.
 * - admin / cajero: locked to their assigned business + branch.
 */
export function resolveContext(req: AuthRequest): TenantContext {
  const u = req.user!
  const q = req.query as Record<string, string | undefined>
  switch (u.role) {
    case 'superadmin':
      return {
        businessId: q.businessId ? Number(q.businessId) : null,
        branchId: q.branchId ? Number(q.branchId) : null,
      }
    case 'dueno':
      return {
        businessId: u.businessId ?? null,
        branchId: q.branchId ? Number(q.branchId) : (u.branchId ?? null),
      }
    default:
      return { businessId: u.businessId ?? null, branchId: u.branchId ?? null }
  }
}

/** True when the user is allowed to work across the whole system. */
export function isSuperAdmin(req: AuthRequest): boolean {
  return req.user?.role === 'superadmin'
}

/** True when the user manages more than one branch (business owner or superadmin). */
export function canSwitchBranch(req: AuthRequest): boolean {
  const r = req.user?.role
  return r === 'superadmin' || r === 'dueno'
}

/**
 * Resolves the branch to use for branch-scoped writes.
 * Uses the request context branch when present, otherwise falls back to the
 * business's first active branch (mirrors the pattern used in purchases).
 */
export async function resolveEffectiveBranchId(ctx: TenantContext): Promise<number | null> {
  if (ctx.branchId) return ctx.branchId
  if (!ctx.businessId) return null
  const branch = await prisma.branch.findFirst({
    where: { businessId: ctx.businessId, active: true },
    select: { id: true },
    orderBy: { id: 'asc' },
  })
  return branch?.id ?? null
}
export interface TenantContext {
  businessId: number | null
  branchId: number | null
}

const KEY = 'tenant_context'

export function loadTenant(): TenantContext {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { businessId: null, branchId: null }
    const parsed = JSON.parse(raw)
    return {
      businessId: parsed.businessId || null,
      branchId: parsed.branchId || null,
    }
  } catch {
    return { businessId: null, branchId: null }
  }
}

export function saveTenant(ctx: TenantContext) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ctx))
  } catch {
    // ignore
  }
}

/** Query-string params appended to scoped requests (business + branch). */
export function tenantParams(): string {
  const { businessId, branchId } = loadTenant()
  const parts: string[] = []
  if (businessId) parts.push(`businessId=${businessId}`)
  if (branchId) parts.push(`branchId=${branchId}`)
  return parts.length ? `?${parts.join('&')}` : ''
}
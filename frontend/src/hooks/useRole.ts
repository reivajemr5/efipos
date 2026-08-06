import { useAuthStore } from '../store/auth'

export type CanManage = boolean

/**
 * Rol helpers. `manage` = puede crear/editar/eliminar en el negocio.
 * Cajero es solo lectura/ventas; admin, dueno y superadmin gestionan.
 */
export function useRole() {
  const role = useAuthStore((s) => s.user?.role) ?? ''

  const isSuper = role === 'superadmin'
  const isDueno = role === 'dueno'
  const isAdmin = role === 'admin'
  const isCajero = role === 'cajero'
  const manage = isSuper || isDueno || isAdmin
  const canViewReports = isSuper || isDueno || isAdmin
  const canCancelInvoices = isSuper || isDueno || isAdmin
  const canSwitchBranch = isSuper || isDueno

  return { role, isSuper, isDueno, isAdmin, isCajero, manage, canViewReports, canCancelInvoices, canSwitchBranch }
}

/** Rutas solo para roles de gestión (admin+). */
export const ADMIN_PATHS = ['/purchases', '/suppliers', '/categories', '/inventory', '/reports', '/accounts/payable', '/settings']

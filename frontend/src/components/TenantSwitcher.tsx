import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth'
import { api } from '../services/api'

interface Business { id: number; name: string; active: boolean }
interface Branch { id: number; name: string; businessId: number; active: boolean }

export default function TenantSwitcher() {
  const { user, activeBusinessId, activeBranchId, setActive } = useAuthStore()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const role = user?.role

  useEffect(() => {
    if (role === 'superadmin') {
      api.businesses.list().then((b: any) => setBusinesses(Array.isArray(b) ? b.filter((x: any) => x.active) : [])).catch(() => {})
      return () => { setBusinesses([]) }
    }
  }, [role])

  useEffect(() => {
    if (role === 'superadmin' && activeBusinessId) {
      api.branches.byBusiness(activeBusinessId).then((b: any) => setBranches(Array.isArray(b) ? b : [])).catch(() => setBranches([]))
    } else if (role === 'dueno') {
      api.branches.list().then((b: any) => setBranches(Array.isArray(b) ? b : [])).catch(() => setBranches([]))
    }
  }, [role, activeBusinessId])

  const currentBusiness = businesses.find((b) => b.id === activeBusinessId)
  const currentBranch = branches.find((b) => b.id === activeBranchId)

  function applyActive(b: Business | null, br: Branch | null) {
    const nextBusinessId = b ? b.id : (user?.businessId ?? null)
    const nextBranchId = br ? br.id : (user?.branchId ?? null)
    setActive(nextBusinessId, nextBranchId)
    window.location.reload()
  }

  if (role === 'admin' || role === 'cajero') {
    return <span className="text-xs text-blue-200 hidden lg:inline">{(currentBranch && currentBusiness) ? `${currentBusiness?.name}` : ''}</span>
  }

  return (
    <div className="flex items-center gap-1.5 mr-1">
      {role === 'superadmin' && (
        <select
          value={activeBusinessId ?? ''}
          onChange={(e) => {
            const b = businesses.find((x) => x.id === Number(e.target.value)) || null
            setActive(b ? b.id : null, b ? null : activeBranchId)
            if (b) api.branches.byBusiness(b.id).then((br: any) => {
              setBranches(Array.isArray(br) ? br : [])
              const first = Array.isArray(br) ? br[0] : undefined
              applyActive(b, first || null)
            })
            else applyActive(null, null)
          }}
          className="bg-blue-800 text-white text-xs rounded-lg px-2 py-1.5 border border-blue-700 focus:outline-none max-w-[140px]"
        >
          <option value="">Negocio…</option>
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}

      {branches.length > 0 && (
        <select
          value={activeBranchId ?? ''}
          onChange={(e) => {
            const br = branches.find((x) => x.id === Number(e.target.value)) || null
            applyActive(null, br)
          }}
          className="bg-blue-800 text-white text-xs rounded-lg px-2 py-1.5 border border-blue-700 focus:outline-none max-w-[140px]"
        >
          <option value="">Sucursal…</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}

      {!currentBusiness && !currentBranch && (
        <span className="text-xs text-amber-200 hidden lg:inline">Selecciona negocio y sucursal</span>
      )}
    </div>
  )
}
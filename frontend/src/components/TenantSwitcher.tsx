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
  const locked = role === 'admin' || role === 'cajero'

  useEffect(() => {
    api.businesses.list()
      .then((b: any) => setBusinesses(Array.isArray(b) ? (role === 'superadmin' ? b.filter((x: any) => x.active) : b) : []))
      .catch(() => setBusinesses([]))
  }, [role])

  useEffect(() => {
    if (role === 'superadmin') {
      if (activeBusinessId) {
        api.branches.byBusiness(activeBusinessId).then((b: any) => setBranches(Array.isArray(b) ? b : [])).catch(() => setBranches([]))
      } else {
        setBranches([])
      }
    } else {
      api.branches.list().then((b: any) => setBranches(Array.isArray(b) ? b : [])).catch(() => setBranches([]))
    }
  }, [role, activeBusinessId])

  const businessId = activeBusinessId ?? user?.businessId ?? null
  const currentBusiness = businesses.find((b) => b.id === businessId)
  const currentBranch = branches.find((b) => b.id === activeBranchId)

  const displayLabel = [currentBusiness?.name, currentBranch?.name].filter(Boolean).join(' · ')

  function applyActive(b: Business | null, br: Branch | null) {
    const nextBusinessId = b ? b.id : businessId
    const nextBranchId = br ? br.id : (user?.branchId ?? null)
    setActive(nextBusinessId, nextBranchId)
    window.location.reload()
  }

  if (locked) {
    return (
      <span className="text-xs text-white/95 bg-blue-800 rounded-lg px-2 py-1 max-w-[45vw] truncate shrink-0" title={displayLabel || 'Sin sucursal'}>
        {displayLabel ? `🏬 ${displayLabel}` : 'Sin sucursal'}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mr-1 min-w-0">
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
          className="bg-blue-800 text-white text-xs rounded-lg px-2 py-1.5 border border-blue-700 focus:outline-none max-w-[130px]"
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
          className="bg-blue-800 text-white text-xs rounded-lg px-2 py-1.5 border border-blue-700 focus:outline-none max-w-[130px]"
        >
          <option value="">Sucursal…</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}

      {(currentBusiness || currentBranch) && (
        <span className="text-xs text-white/95 bg-blue-700 rounded-lg px-2 py-1 max-w-[160px] truncate shrink-0 hidden sm:inline" title={displayLabel}>
          {displayLabel}
        </span>
      )}

      {!currentBusiness && !currentBranch && (
        <span className="text-xs text-amber-200">Selecciona negocio y sucursal</span>
      )}
    </div>
  )
}
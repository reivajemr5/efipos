import { create } from 'zustand'
import { loadTenant, saveTenant } from '../services/tenant'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  businessId?: number | null
  branchId?: number | null
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  activeBusinessId: number | null
  activeBranchId: number | null
  setAuth: (token: string, user: AuthUser) => void
  setActive: (businessId: number | null, branchId: number | null) => void
  logout: () => void
}

const initial = loadTenant()

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  activeBusinessId: initial.businessId,
  activeBranchId: initial.branchId,
  setAuth: (token, user) => {
    const saved = loadTenant()
    const businessId = user.businessId ?? saved.businessId
    const branchId = user.branchId ?? saved.branchId
    saveTenant({ businessId, branchId })
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
    set({
      token,
      user,
      activeBusinessId: businessId,
      activeBranchId: branchId,
    })
  },
  setActive: (businessId, branchId) => {
    saveTenant({ businessId, branchId })
    set({ activeBusinessId: businessId, activeBranchId: branchId })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    saveTenant({ businessId: null, branchId: null })
    set({ token: null, user: null, activeBusinessId: null, activeBranchId: null })
  },
}))
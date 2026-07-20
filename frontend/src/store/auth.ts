import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: { id: number; name: string; role: string } | null
  setAuth: (token: string, user: { id: number; name: string; role: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}))

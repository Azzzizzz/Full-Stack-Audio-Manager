import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  first_name: string
  last_name: string
  email: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  hasHydrated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'meeami-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser } from '@/types/api'

const STORAGE_KEY_TOKEN = 'access_token'
const STORAGE_KEY_USER  = 'auth_user'

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEY_TOKEN))

  const user = ref<AuthUser | null>(
    (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_USER)
        return raw ? (JSON.parse(raw) as AuthUser) : null
      } catch {
        return null
      }
    })()
  )

  // ── Getters ────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value)
  const role            = computed(() => user.value?.role ?? null)
  const userId          = computed(() => user.value?.userId ?? null)

  // ── Actions ────────────────────────────────────────────────────────────
  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem(STORAGE_KEY_TOKEN, newToken)
  }

  function setUser(newUser: AuthUser) {
    user.value = newUser
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser))
  }

  function setAuth(newToken: string, newUser: AuthUser) {
    setToken(newToken)
    setUser(newUser)
  }

  function clearAuth() {
    token.value = null
    user.value  = null
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_USER)
  }

  return {
    // state
    token,
    user,
    // getters
    isAuthenticated,
    role,
    userId,
    // actions
    setToken,
    setUser,
    setAuth,
    clearAuth,
  }
})

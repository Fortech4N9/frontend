import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/shared/api'
import type { User, LoginPayload, RegisterPayload, AuthResponse } from './types'
import router from '@/app/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setAuth(data: AuthResponse) {
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
  }

  function hydrateUserFromToken() {
    if (user.value || !token.value) return
    try {
      const payload = token.value.split('.')[1]
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
      const data = JSON.parse(atob(padded))
      user.value = {
        id: data.user_id,
        email: data.email,
        role: data.role ?? 'user',
        analysis_quota: Number(data.analysis_quota ?? 10),
        is_active: Boolean(data.is_active ?? true),
        created_at: new Date().toISOString(),
      }
    } catch {
      token.value = null
      localStorage.removeItem('token')
    }
  }

  async function login(payload: LoginPayload) {
    loading.value = true
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', payload)
      setAuth(data)
      await router.push('/dashboard')
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    loading.value = true
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', payload)
      setAuth(data)
      await router.push('/dashboard')
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    router.push('/login')
  }

  function applyAuthToken(nextToken: string, nextUser: User) {
    setAuth({ token: nextToken, user: nextUser })
  }

  hydrateUserFromToken()

  return { user, token, loading, isAuthenticated, isAdmin, login, register, logout, applyAuthToken }
})

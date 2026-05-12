import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/shared/api'
import type {
  AdminProject,
  AdminUser,
  AnalysisAdminStats,
  CoreAdminStats,
  Pagination,
  SystemStatus,
  TopPattern,
} from './types'

export const useAdminStore = defineStore('admin', () => {
  const users = ref<AdminUser[]>([])
  const projects = ref<AdminProject[]>([])
  const usersPagination = ref<Pagination>({ page: 1, limit: 20, total: 0 })
  const projectsPagination = ref<Pagination>({ page: 1, limit: 20, total: 0 })
  const coreStats = ref<CoreAdminStats | null>(null)
  const analysisStats = ref<AnalysisAdminStats | null>(null)
  const topPatterns = ref<TopPattern[]>([])
  const systemStatus = ref<SystemStatus | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers(page = 1, limit = 20) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<{ users: AdminUser[]; pagination: Pagination }>(
        '/admin/users',
        { params: { page, limit } },
      )
      users.value = data.users
      usersPagination.value = data.pagination
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Не удалось загрузить пользователей'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchProjects(page = 1, limit = 20) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<{ projects: AdminProject[]; pagination: Pagination }>(
        '/admin/projects',
        { params: { page, limit } },
      )
      projects.value = data.projects
      projectsPagination.value = data.pagination
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Не удалось загрузить проекты'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchCoreStats() {
    error.value = null
    const { data } = await api.get<CoreAdminStats>('/admin/stats')
    coreStats.value = data
  }

  async function fetchAnalysisStats() {
    error.value = null
    const { data } = await api.get<AnalysisAdminStats>('/analysis/admin/stats')
    analysisStats.value = data
  }

  async function fetchTopPatterns(limit = 15) {
    error.value = null
    const { data } = await api.get<{ patterns: TopPattern[] }>('/analysis/admin/patterns/top', {
      params: { limit },
    })
    topPatterns.value = data.patterns
  }

  async function fetchSystemStatus() {
    error.value = null
    const { data } = await api.get<SystemStatus>('/analysis/admin/system-status')
    systemStatus.value = data
  }

  async function updateUserQuota(userId: string, analysisQuota: number) {
    await api.patch(`/admin/users/${userId}/quota`, { analysis_quota: analysisQuota })
  }

  async function updateUserStatus(userId: string, isActive: boolean) {
    await api.patch(`/admin/users/${userId}/active`, { is_active: isActive })
  }

  async function impersonate(userId: string): Promise<string> {
    const { data } = await api.post<{ token: string }>(`/admin/users/${userId}/impersonate`)
    return data.token
  }

  return {
    users,
    projects,
    usersPagination,
    projectsPagination,
    coreStats,
    analysisStats,
    topPatterns,
    systemStatus,
    loading,
    error,
    fetchUsers,
    fetchProjects,
    fetchCoreStats,
    fetchAnalysisStats,
    fetchTopPatterns,
    fetchSystemStatus,
    updateUserQuota,
    updateUserStatus,
    impersonate,
  }
})

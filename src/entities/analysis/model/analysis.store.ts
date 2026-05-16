import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/shared/api'
import type {
  AggregatedPattern,
  AnalysisTask,
  AnalysisMetrics,
  CacheSimulatorConfig,
  FileSimulationResults,
  ProjectFile,
} from './types'

const LS_CACHE_CFG = 'preferred_cache_sim_config_id'

export const useAnalysisStore = defineStore('analysis', () => {
  const tasks = ref<AnalysisTask[]>([])
  const files = ref<ProjectFile[]>([])
  const loading = ref(false)

  async function fetchProjectTasks(projectId: string) {
    loading.value = true
    try {
      const { data } = await api.get<{ tasks: AnalysisTask[] }>(
        `/analysis/projects/${projectId}/tasks`,
      )
      tasks.value = data.tasks ?? []
    } finally {
      loading.value = false
    }
  }

  async function fetchProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const { data } = await api.get<{ files: ProjectFile[] }>(
      `/analysis/projects/${projectId}/files`,
    )
    files.value = data.files ?? []
    return files.value
  }

  async function fetchFileContent(fileId: string): Promise<string> {
    const { data } = await api.get<string>(`/analysis/files/${fileId}/content`, {
      responseType: 'text',
      transformResponse: [(v) => v],
    })
    return data
  }

  async function fetchCacheConfigs(): Promise<CacheSimulatorConfig[]> {
    const { data } = await api.get<{ configs: CacheSimulatorConfig[] }>(
      '/analysis/cache-configs',
    )
    return data.configs ?? []
  }

  async function uploadCacheConfig(file: File, displayName?: string): Promise<CacheSimulatorConfig> {
    const form = new FormData()
    form.append('file', file)
    if (displayName?.trim()) form.append('name', displayName.trim())
    const { data } = await api.post<{ config: CacheSimulatorConfig }>('/analysis/cache-configs', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.config
  }

  async function deleteCacheConfig(id: string): Promise<void> {
    await api.delete(`/analysis/cache-configs/${id}`)
  }

  /** Мягкое удаление: запись скрыта из списков, объект в хранилище сохранён. */
  async function deleteProjectFile(fileId: string): Promise<void> {
    await api.delete(`/analysis/files/${fileId}`)
  }

  /** Сохраняем последний выбранный конфиг в localStorage. */
  function persistPreferredCacheConfig(id: string | null) {
    try {
      if (!id) {
        localStorage.removeItem(LS_CACHE_CFG)
      } else {
        localStorage.setItem(LS_CACHE_CFG, id)
      }
    } catch {
      /* ignore */
    }
  }

  function readPreferredCacheConfig(): string | null {
    try {
      return localStorage.getItem(LS_CACHE_CFG)?.trim() || null
    } catch {
      return null
    }
  }

  async function uploadFile(
    projectId: string,
    file: File,
    cacheConfigId: string,
  ): Promise<AnalysisTask> {
    const form = new FormData()
    form.append('project_id', projectId)
    form.append('file', file)
    form.append('cache_config_id', cacheConfigId)
    const { data } = await api.post<{ task: AnalysisTask }>('/analysis/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    tasks.value.unshift(data.task)
    return data.task
  }

  // analyzeExistingFile — повторный анализ уже загруженного файла без записи
  // нового объекта в MinIO и новой строки в files.
  async function analyzeExistingFile(
    fileId: string,
    cacheConfigId: string,
  ): Promise<AnalysisTask> {
    const form = new FormData()
    form.append('cache_config_id', cacheConfigId)
    const { data } = await api.post<{ task: AnalysisTask }>(
      `/analysis/files/${fileId}/analyze`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    tasks.value.unshift(data.task)
    return data.task
  }

  async function fetchTaskStatus(taskId: string): Promise<AnalysisTask> {
    const { data } = await api.get<AnalysisTask>(`/analysis/tasks/${taskId}`)
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx !== -1) tasks.value[idx] = data
    return data
  }

  async function fetchTaskMetrics(taskId: string): Promise<AnalysisMetrics> {
    const { data } = await api.get<AnalysisMetrics>(`/analysis/tasks/${taskId}/metrics`)
    return data
  }

  // fetchTaskAggregated — паттерны из ClickHouse-JOIN static + dynamic.
  // Когда динамика не успела (или упала), backend возвращает пустой массив;
  // тогда вызов fetchTaskStaticPatterns даст хотя бы статические данные.
  async function fetchTaskAggregated(taskId: string): Promise<AggregatedPattern[]> {
    const { data } = await api.get<{ patterns: AggregatedPattern[] }>(
      `/analysis/tasks/${taskId}/aggregated`,
    )
    return data.patterns ?? []
  }

  async function fetchTaskStaticPatterns(taskId: string): Promise<AggregatedPattern[]> {
    const { data } = await api.get<{ patterns: AggregatedPattern[] }>(
      `/analysis/tasks/${taskId}/static-patterns`,
    )
    return data.patterns ?? []
  }

  async function fetchFileSimulationResults(fileId: string): Promise<FileSimulationResults> {
    const { data } = await api.get<FileSimulationResults>(
      `/analysis/files/${fileId}/simulation-results`,
    )
    return data
  }

  return {
    tasks,
    files,
    loading,
    fetchProjectTasks,
    fetchProjectFiles,
    fetchFileContent,
    fetchCacheConfigs,
    uploadCacheConfig,
    deleteCacheConfig,
    persistPreferredCacheConfig,
    readPreferredCacheConfig,
    uploadFile,
    analyzeExistingFile,
    deleteProjectFile,
    fetchTaskStatus,
    fetchTaskMetrics,
    fetchTaskAggregated,
    fetchTaskStaticPatterns,
    fetchFileSimulationResults,
  }
})

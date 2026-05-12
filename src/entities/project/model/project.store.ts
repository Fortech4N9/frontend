import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/shared/api'
import type { Project, CreateProjectPayload } from './types'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)

  async function fetchProjects() {
    loading.value = true
    try {
      const { data } = await api.get<{ projects: Project[] }>('/projects')
      projects.value = data.projects ?? []
    } finally {
      loading.value = false
    }
  }

  async function createProject(payload: CreateProjectPayload): Promise<Project> {
    const { data } = await api.post<Project>('/projects', payload)
    projects.value.unshift(data)
    return data
  }

  async function deleteProject(id: string) {
    await api.delete(`/projects/${id}`)
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  return { projects, loading, fetchProjects, createProject, deleteProject }
})

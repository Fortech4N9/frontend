<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { useProjectStore } from '@/entities/project'
import AppHeader from '@/widgets/AppHeader.vue'
import ProjectCard from '@/widgets/ProjectCard.vue'
import CreateProjectModal from '@/widgets/CreateProjectModal.vue'
import { AppButton } from '@/shared/ui'
import { Plus, FolderOpen } from 'lucide-vue-next'

const store = useProjectStore()
const toast = inject<(msg: string, type: string) => void>('toast')!
const showModal = ref(false)

onMounted(() => {
  store.fetchProjects()
})

async function handleDelete(id: string) {
  try {
    await store.deleteProject(id)
    toast('Проект удалён', 'success')
  } catch {
    toast('Ошибка удаления', 'error')
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950">
    <AppHeader />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Проекты</h1>
          <p class="text-sm text-zinc-500 mt-1">Управляйте проектами анализа кэш-эффективности</p>
        </div>
        <AppButton @click="showModal = true">
          <Plus class="h-4 w-4 mr-2" />
          Новый проект
        </AppButton>
      </div>

      <div v-if="store.loading" class="flex justify-center py-20">
        <div class="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>

      <div v-else-if="store.projects.length === 0" class="text-center py-20">
        <FolderOpen class="h-16 w-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-zinc-600 dark:text-zinc-400">Нет проектов</h3>
        <p class="text-sm text-zinc-400 mt-1 mb-6">Создайте первый проект для анализа</p>
        <AppButton @click="showModal = true">
          <Plus class="h-4 w-4 mr-2" />
          Создать проект
        </AppButton>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProjectCard
          v-for="project in store.projects"
          :key="project.id"
          :project="project"
          @delete="handleDelete"
        />
      </div>
    </main>

    <CreateProjectModal v-if="showModal" @close="showModal = false" />
  </div>
</template>

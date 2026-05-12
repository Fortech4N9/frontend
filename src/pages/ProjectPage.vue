<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useAnalysisStore } from '@/entities/analysis'
import AppHeader from '@/widgets/AppHeader.vue'
import FileDropZone from '@/features/upload/FileDropZone.vue'
import AnalysisPipelineStatus from '@/widgets/AnalysisPipelineStatus.vue'
import MetricsPanel from '@/widgets/MetricsPanel.vue'
import { ArrowLeft, FileCode } from 'lucide-vue-next'

const route = useRoute()
const store = useAnalysisStore()
const toast = inject<(msg: string, type: string) => void>('toast')!

const projectId = route.params.id as string
const uploading = ref(false)
const metricsTaskId = ref<string | null>(null)

// Map task_id → filename for display
const fileNames = ref<Record<string, string>>({})

onMounted(() => {
  store.fetchProjectTasks(projectId)
})

async function handleFileDrop(file: File) {
  uploading.value = true
  try {
    const task = await store.uploadFile(projectId, file)
    fileNames.value[task.id] = file.name
    toast(`${file.name} загружен, анализ запущен`, 'success')
  } catch (e: any) {
    toast(e.response?.data?.error || 'Ошибка загрузки', 'error')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950">
    <AppHeader />

    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RouterLink
        to="/dashboard"
        class="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6"
      >
        <ArrowLeft :size="16" />
        Назад к проектам
      </RouterLink>

      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Анализ файлов</h1>

      <!-- Upload zone -->
      <div class="mb-8">
        <FileDropZone @drop="handleFileDrop" />
        <div v-if="uploading" class="mt-3 flex items-center gap-2 text-sm text-indigo-600">
          <div class="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" />
          Загрузка файла...
        </div>
      </div>

      <!-- Tasks list -->
      <div>
        <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Задачи анализа</h2>

        <div v-if="store.loading" class="flex justify-center py-10">
          <div class="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>

        <div v-else-if="store.tasks.length === 0" class="text-center py-12">
          <FileCode class="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p class="text-sm text-zinc-500">Загрузите .c файл для запуска анализа</p>
        </div>

        <div v-else class="space-y-3">
          <AnalysisPipelineStatus
            v-for="task in store.tasks"
            :key="task.id"
            :task-id="task.id"
            :file-name="fileNames[task.id] || `file-${task.file_id.slice(0, 8)}.c`"
            :initial-status="task.status"
            @view-metrics="metricsTaskId = $event"
          />
        </div>
      </div>
    </main>

    <MetricsPanel
      v-if="metricsTaskId"
      :task-id="metricsTaskId"
      @close="metricsTaskId = null"
    />
  </div>
</template>

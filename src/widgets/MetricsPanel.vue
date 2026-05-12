<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  useAnalysisStore,
  type AggregatedPattern,
  type AnalysisMetrics,
  type AnalysisTask,
  type TaskStatus,
} from '@/entities/analysis'
import ExtendedResultsPanel from './ExtendedResultsPanel.vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{ taskId: string }>()
defineEmits<{ close: [] }>()

const store = useAnalysisStore()
const metrics = ref<AnalysisMetrics | null>(null)
const patterns = ref<AggregatedPattern[]>([])
const task = ref<AnalysisTask | null>(null)
const status = ref<TaskStatus | undefined>(undefined)
const errorMessage = ref<string | null>(null)
const reusedFromTaskId = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const [m, t, agg] = await Promise.allSettled([
      store.fetchTaskMetrics(props.taskId),
      store.fetchTaskStatus(props.taskId),
      store.fetchTaskAggregated(props.taskId),
    ])

    if (m.status === 'fulfilled') metrics.value = m.value
    if (t.status === 'fulfilled') {
      task.value = t.value
      status.value = t.value.status
      errorMessage.value = t.value.error_message?.trim() ? t.value.error_message : null
      reusedFromTaskId.value = t.value.reused_from_task_id?.trim()
        ? t.value.reused_from_task_id
        : null
    }
    if (agg.status === 'fulfilled') patterns.value = agg.value

    // Если задача с ошибкой и /aggregated пустой — все равно попробуем поднять
    // чистый статик-список: это часто остаётся доступным, если упал только
    // dynamic stage.
    if (patterns.value.length === 0) {
      try {
        patterns.value = await store.fetchTaskStaticPatterns(props.taskId)
      } catch {
        // тихо игнорируем — таблица просто будет пустой
      }
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')" />
      <div class="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">Результаты анализа</h2>
          <button class="text-zinc-400 hover:text-zinc-600 cursor-pointer" @click="$emit('close')">
            <X :size="20" />
          </button>
        </div>

        <div class="overflow-y-auto p-5">
          <div v-if="loading" class="flex justify-center py-10">
            <div class="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>

          <ExtendedResultsPanel
            v-else
            :task-id="taskId"
            :status="status"
            :metrics="metrics"
            :patterns="patterns"
            :error-message="errorMessage"
            :reused-from-task-id="reusedFromTaskId"
            :loading="false"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

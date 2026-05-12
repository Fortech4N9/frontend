<script setup lang="ts">
import { computed } from 'vue'
import { useAnalysisPolling } from '@/shared/lib/useAnalysisPolling'
import { STATUS_LABELS, type TaskStatus } from '@/entities/analysis'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Loader2,
  Recycle,
  XCircle,
} from 'lucide-vue-next'

const props = defineProps<{
  taskId: string
  fileName: string
  initialStatus: TaskStatus
}>()

const emit = defineEmits<{ viewMetrics: [taskId: string] }>()

const { status, errorMessage, reusedFromTaskId } = useAnalysisPolling(props.taskId)

const isRunning = computed(() =>
  ['pending', 'static_running', 'static_done', 'cache_running'].includes(status.value),
)
const isDone = computed(() => status.value === 'done')
const isError = computed(() => status.value === 'error')

const steps = computed(() => [
  {
    label: 'Загрузка',
    done: true,
    active: false,
  },
  {
    label: 'Статический анализ',
    done: ['static_done', 'cache_running', 'done'].includes(status.value),
    active: status.value === 'static_running',
  },
  {
    label: 'Кэш-симуляция',
    done: status.value === 'done',
    active: status.value === 'cache_running',
  },
  {
    label: 'Готово',
    done: status.value === 'done',
    active: false,
  },
])
</script>

<template>
  <div class="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div
          class="flex items-center justify-center w-9 h-9 rounded-lg"
          :class="{
            'bg-yellow-100 dark:bg-yellow-950 text-yellow-600': isRunning,
            'bg-green-100 dark:bg-green-950 text-green-600': isDone,
            'bg-red-100 dark:bg-red-950 text-red-600': isError,
          }"
        >
          <Loader2 v-if="isRunning" :size="18" class="animate-spin" />
          <CheckCircle v-else-if="isDone" :size="18" />
          <XCircle v-else :size="18" />
        </div>
        <div>
          <p class="text-sm font-medium text-zinc-900 dark:text-white">{{ fileName }}</p>
          <p class="text-xs text-zinc-500">{{ STATUS_LABELS[status] }}</p>
          <p
            v-if="reusedFromTaskId"
            class="mt-0.5 flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400"
            :title="reusedFromTaskId"
          >
            <Recycle :size="11" />
            переиспользовано из {{ reusedFromTaskId.slice(0, 8) }}…
          </p>
        </div>
      </div>

      <button
        v-if="isDone || isError"
        class="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-500 font-medium cursor-pointer"
        @click="emit('viewMetrics', taskId)"
      >
        <BarChart3 :size="16" />
        Подробнее
      </button>
    </div>

    <!-- Pipeline steps -->
    <div class="flex items-center gap-1">
      <template v-for="(step, i) in steps" :key="i">
        <div class="flex items-center gap-1.5">
          <div
            class="w-2.5 h-2.5 rounded-full transition-colors"
            :class="{
              'bg-green-500': step.done,
              'bg-indigo-500 animate-pulse': step.active,
              'bg-red-400': isError && !step.done && !step.active,
              'bg-zinc-200 dark:bg-zinc-700': !isError && !step.done && !step.active,
            }"
          />
          <span
            class="text-xs whitespace-nowrap"
            :class="{
              'text-green-600 font-medium': step.done,
              'text-indigo-600 font-medium': step.active,
              'text-zinc-400': !step.done && !step.active,
            }"
          >
            {{ step.label }}
          </span>
        </div>
        <div
          v-if="i < steps.length - 1"
          class="flex-1 h-px mx-1"
          :class="step.done ? 'bg-green-300' : 'bg-zinc-200 dark:bg-zinc-700'"
        />
      </template>
    </div>

    <!-- Error message banner -->
    <div
      v-if="isError && errorMessage"
      class="mt-4 rounded-lg border border-red-300/60 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3"
    >
      <div class="flex items-start gap-2">
        <AlertTriangle :size="14" class="mt-0.5 text-red-500 shrink-0" />
        <div class="min-w-0">
          <p class="text-xs font-semibold text-red-700 dark:text-red-300 mb-0.5">
            Причина ошибки
          </p>
          <p class="text-xs text-red-600 dark:text-red-200 whitespace-pre-wrap leading-relaxed">
            {{ errorMessage }}
          </p>
          <p class="mt-1 text-[11px] text-red-500/80 dark:text-red-300/80">
            Откройте «Подробнее», чтобы посмотреть статические паттерны (если они собраны).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

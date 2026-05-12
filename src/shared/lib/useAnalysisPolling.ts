import { ref, onUnmounted } from 'vue'
import { useAnalysisStore } from '@/entities/analysis'
import type { AnalysisTask, TaskStatus } from '@/entities/analysis'

const TERMINAL_STATUSES: TaskStatus[] = ['done', 'error']

export function useAnalysisPolling(taskId: string, intervalMs = 2500) {
  const status = ref<TaskStatus>('pending')
  const polling = ref(true)
  const errorMessage = ref<string | null>(null)
  const reusedFromTaskId = ref<string | null>(null)
  const task = ref<AnalysisTask | null>(null)
  const store = useAnalysisStore()

  let timer: ReturnType<typeof setInterval> | null = null

  async function poll() {
    try {
      const fetched = await store.fetchTaskStatus(taskId)
      task.value = fetched
      status.value = fetched.status
      errorMessage.value = fetched.error_message?.trim() ? fetched.error_message : null
      reusedFromTaskId.value = fetched.reused_from_task_id?.trim()
        ? fetched.reused_from_task_id
        : null

      if (TERMINAL_STATUSES.includes(fetched.status)) {
        stop()
      }
    } catch {
      stop()
    }
  }

  function start() {
    polling.value = true
    poll()
    timer = setInterval(poll, intervalMs)
  }

  function stop() {
    polling.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onUnmounted(stop)

  start()

  return { status, polling, errorMessage, reusedFromTaskId, task, stop }
}

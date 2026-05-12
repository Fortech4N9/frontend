<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useAdminStore } from '@/entities/admin'

const admin = useAdminStore()
let timer: number | undefined

const services = computed(() => {
  if (!admin.systemStatus) return []
  return [
    { name: 'PostgreSQL', value: admin.systemStatus.postgres },
    { name: 'MinIO', value: admin.systemStatus.minio },
    { name: 'Kafka', value: admin.systemStatus.kafka },
    { name: 'ClickHouse', value: admin.systemStatus.clickhouse },
  ]
})

async function refresh() {
  await admin.fetchSystemStatus()
}

onMounted(async () => {
  await refresh()
  timer = window.setInterval(refresh, 10000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Состояние системы</h1>
        <p class="text-sm text-zinc-500 mt-1">Автообновление каждые 10 секунд.</p>
      </div>
      <button
        class="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm cursor-pointer"
        @click="refresh"
      >
        Обновить
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <article
        v-for="svc in services"
        :key="svc.name"
        class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
      >
        <p class="text-sm text-zinc-500">{{ svc.name }}</p>
        <p :class="svc.value.status === 'ok' ? 'text-emerald-600' : 'text-rose-600'" class="text-lg font-semibold mt-2">
          {{ svc.value.status.toUpperCase() }}
        </p>
        <p v-if="svc.value.error" class="text-xs text-rose-500 mt-2 break-words">{{ svc.value.error }}</p>
      </article>
    </div>

    <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Очередь Kafka</h2>
      <p class="text-sm text-zinc-600 dark:text-zinc-300">
        <code>events.analysis.start_static</code>: {{ admin.systemStatus?.start_static_queue ?? 0 }} сообщений в очереди
      </p>
      <p class="text-xs text-zinc-500 mt-2">
        Если очередь растёт, а статусы задач не меняются — вероятно воркеры недоступны.
      </p>
    </div>
  </section>
</template>

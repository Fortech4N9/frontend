<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAdminStore } from '@/entities/admin'
import { useRouter } from 'vue-router'

const admin = useAdminStore()
const router = useRouter()

const quickStats = computed(() => [
  { title: 'Пользователи', value: admin.coreStats?.total_users ?? 0 },
  { title: 'Проекты', value: admin.coreStats?.total_projects ?? 0 },
  { title: 'Файлы', value: admin.analysisStats?.total_files ?? 0 },
  { title: 'Done задач', value: admin.analysisStats?.done ?? 0 },
])

async function refreshSettings() {
  await Promise.all([
    admin.fetchCoreStats(),
    admin.fetchAnalysisStats(),
    admin.fetchSystemStatus(),
  ])
}

onMounted(async () => {
  try {
    await refreshSettings()
  } catch {
    // error is shown from admin.error
  }
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Настройки</h1>
        <p class="text-sm text-zinc-500 mt-1">Быстрые админ-действия и состояние системы.</p>
      </div>
      <button
        class="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm cursor-pointer"
        @click="refreshSettings"
      >
        Обновить
      </button>
    </div>

    <div
      v-if="admin.error"
      class="rounded-xl border border-rose-300 bg-rose-50 text-rose-700 px-4 py-3 text-sm"
    >
      {{ admin.error }}
    </div>

    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <article
        v-for="item in quickStats"
        :key="item.title"
        class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
      >
        <p class="text-xs text-zinc-500">{{ item.title }}</p>
        <p class="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{{ item.value }}</p>
      </article>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-left hover:border-indigo-400 transition-colors"
        @click="router.push('/admin/users')"
      >
        <h2 class="font-semibold text-zinc-900 dark:text-white">Управление пользователями</h2>
        <p class="text-sm text-zinc-500 mt-1">Блокировка, квоты и impersonation.</p>
      </button>
      <button
        class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-left hover:border-indigo-400 transition-colors cursor-pointer"
        @click="router.push('/admin/system-status')"
      >
        <h2 class="font-semibold text-zinc-900 dark:text-white">Состояние системы</h2>
        <p class="text-sm text-zinc-500 mt-1">PostgreSQL, MinIO, Kafka, ClickHouse и размер очереди.</p>
      </button>
      <button
        class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-left hover:border-indigo-400 transition-colors"
        @click="router.push('/admin/projects')"
      >
        <h2 class="font-semibold text-zinc-900 dark:text-white">Глобальные проекты</h2>
        <p class="text-sm text-zinc-500 mt-1">Сводка по всем проектам и их владельцам.</p>
      </button>
    </div>
  </section>
</template>

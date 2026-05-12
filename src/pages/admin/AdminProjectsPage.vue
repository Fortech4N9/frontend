<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from '@/entities/admin'

const admin = useAdminStore()

onMounted(() => {
  admin.fetchProjects()
})
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Проекты</h1>
      <p class="text-sm text-zinc-500 mt-1">Глобальный список проектов с владельцами.</p>
    </div>

    <div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <table class="min-w-full text-sm">
        <thead class="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300">
          <tr>
            <th class="text-left px-4 py-3">Проект</th>
            <th class="text-left px-4 py-3">Владелец</th>
            <th class="text-left px-4 py-3">Роль владельца</th>
            <th class="text-left px-4 py-3">Создан</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in admin.projects"
            :key="p.id"
            class="border-t border-zinc-100 dark:border-zinc-800"
          >
            <td class="px-4 py-3 text-zinc-900 dark:text-white">{{ p.name }}</td>
            <td class="px-4 py-3">{{ p.user_email }}</td>
            <td class="px-4 py-3">{{ p.user_role }}</td>
            <td class="px-4 py-3">{{ new Date(p.created_at).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

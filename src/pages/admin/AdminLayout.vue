<script setup lang="ts">
import { useAuthStore } from '@/entities/user'
import { LayoutDashboard, Users, FolderKanban, Settings, Server } from 'lucide-vue-next'
import ThemeToggle from '@/features/theme-toggle/ThemeToggle.vue'

const auth = useAuthStore()

const nav = [
  { to: '/admin', label: 'Дашборд', icon: LayoutDashboard, name: 'admin-dashboard' },
  { to: '/admin/users', label: 'Пользователи', icon: Users, name: 'admin-users' },
  { to: '/admin/projects', label: 'Проекты', icon: FolderKanban, name: 'admin-projects' },
  { to: '/admin/settings', label: 'Настройки', icon: Settings, name: 'admin-settings' },
  { to: '/admin/system-status', label: 'Состояние системы', icon: Server, name: 'admin-system-status' },
]
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
    <aside class="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div class="mb-8 flex items-start justify-between gap-2">
        <div>
          <h1 class="text-xl font-bold text-zinc-900 dark:text-white">Админ-панель</h1>
          <p class="text-xs text-zinc-500 mt-1">{{ auth.user?.email }}</p>
        </div>
        <ThemeToggle />
      </div>

      <nav class="space-y-1">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            $route.name === item.name
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
          ]"
        >
          <component :is="item.icon" :size="16" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-2">
        <RouterLink to="/dashboard" class="block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          Вернуться к проектам
        </RouterLink>
        <button
          class="text-sm text-rose-600 hover:text-rose-700"
          type="button"
          @click="auth.logout()"
        >
          Выйти
        </button>
      </div>
    </aside>

    <main class="flex-1 p-8">
      <RouterView />
    </main>
  </div>
</template>

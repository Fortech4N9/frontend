<script setup lang="ts">
import { useAuthStore } from '@/entities/user'
import { LogOut, Activity, Code2 } from 'lucide-vue-next'
import { AppButton } from '@/shared/ui'
import { useRoute } from 'vue-router'
import ThemeToggle from '@/features/theme-toggle/ThemeToggle.vue'

const auth = useAuthStore()
const route = useRoute()
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <RouterLink to="/dashboard" class="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white">
          <Activity class="h-6 w-6 text-indigo-600" />
          Анализ кэша
        </RouterLink>

        <nav class="hidden sm:flex items-center gap-1">
          <RouterLink
            to="/dashboard"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              route.name === 'dashboard'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
            ]"
          >
            Проекты
          </RouterLink>
          <RouterLink
            to="/sandbox"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5',
              route.name === 'sandbox'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
            ]"
          >
            <Code2 :size="14" />
            Песочница
          </RouterLink>
          <RouterLink
            v-if="auth.isAdmin"
            to="/admin"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              String(route.name).startsWith('admin')
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
            ]"
          >
            Админка
          </RouterLink>
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-sm text-zinc-500 hidden sm:block">
          {{ auth.user?.email }}
        </span>
        <ThemeToggle />
        <AppButton variant="ghost" size="sm" @click="auth.logout()">
          <LogOut class="h-4 w-4 mr-1" />
          Выйти
        </AppButton>
      </div>
    </div>
  </header>
</template>

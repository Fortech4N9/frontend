<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/entities/theme'
import { Sun, Moon } from 'lucide-vue-next'

const theme = useThemeStore()

const isDark = computed(() => theme.theme === 'dark')
const label = computed(() => (isDark.value ? 'Светлая тема' : 'Тёмная тема'))
</script>

<template>
  <button
    type="button"
    :title="label"
    :aria-label="label"
    class="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
    @click="theme.toggle()"
  >
    <Sun v-if="isDark" :size="16" />
    <Moon v-else :size="16" />
  </button>
</template>

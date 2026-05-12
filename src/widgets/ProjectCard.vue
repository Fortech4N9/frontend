<script setup lang="ts">
import type { Project } from '@/entities/project'
import { Folder, Trash2, ArrowRight } from 'lucide-vue-next'
import { AppButton } from '@/shared/ui'

defineProps<{ project: Project }>()
defineEmits<{ delete: [id: string] }>()
</script>

<template>
  <div class="group relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
          <Folder :size="20" />
        </div>
        <div>
          <h3 class="font-semibold text-zinc-900 dark:text-white">{{ project.name }}</h3>
          <p class="text-xs text-zinc-400 mt-0.5">
            {{ new Date(project.created_at).toLocaleDateString('ru-RU') }}
          </p>
        </div>
      </div>

      <AppButton
        variant="ghost"
        size="sm"
        class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        @click.stop="$emit('delete', project.id)"
      >
        <Trash2 :size="16" />
      </AppButton>
    </div>

    <RouterLink
      :to="`/projects/${project.id}`"
      class="mt-4 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 font-medium"
    >
      Открыть проект
      <ArrowRight :size="14" />
    </RouterLink>
  </div>
</template>

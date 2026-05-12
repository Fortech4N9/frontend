<script setup lang="ts">
import { ref, inject } from 'vue'
import { useProjectStore } from '@/entities/project'
import { AppButton, AppInput } from '@/shared/ui'
import { X } from 'lucide-vue-next'

const emit = defineEmits<{ close: [] }>()
const store = useProjectStore()
const toast = inject<(msg: string, type: string) => void>('toast')!

const name = ref('')
const loading = ref(false)
const error = ref('')

async function create() {
  if (!name.value.trim()) {
    error.value = 'Введите название проекта'
    return
  }
  loading.value = true
  try {
    await store.createProject({ name: name.value.trim() })
    toast('Проект создан', 'success')
    emit('close')
  } catch (e: any) {
    toast(e.response?.data?.error || 'Ошибка создания', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')" />
      <div class="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">Новый проект</h2>
          <button class="text-zinc-400 hover:text-zinc-600 cursor-pointer" @click="$emit('close')">
            <X :size="20" />
          </button>
        </div>

        <form @submit.prevent="create" class="space-y-4">
          <AppInput
            v-model="name"
            label="Название проекта"
            placeholder="My OS Kernel"
            :error="error"
          />
          <div class="flex gap-3 justify-end">
            <AppButton variant="secondary" type="button" @click="$emit('close')">Отмена</AppButton>
            <AppButton :loading="loading">Создать</AppButton>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

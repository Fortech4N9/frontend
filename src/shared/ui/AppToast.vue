<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { cn } from '@/shared/lib/cn'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts = ref<Toast[]>([])
let nextId = 0

function addToast(message: string, type: Toast['type'] = 'info') {
  const id = nextId++
  toasts.value.push({ id, message, type })
  setTimeout(() => removeToast(id), 4000)
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

defineExpose({ addToast })
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-2 w-80">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="cn(
            'rounded-lg px-4 py-3 shadow-lg text-sm font-medium flex items-center justify-between',
            {
              'bg-green-600 text-white': toast.type === 'success',
              'bg-red-600 text-white': toast.type === 'error',
              'bg-indigo-600 text-white': toast.type === 'info',
            },
          )"
        >
          <span>{{ toast.message }}</span>
          <button class="ml-3 opacity-70 hover:opacity-100 cursor-pointer" @click="removeToast(toast.id)">
            <X :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active { animation: slideIn 0.3s ease-out; }
.toast-leave-active { animation: slideOut 0.2s ease-in; }
@keyframes slideIn { from { opacity: 0; transform: translateX(100%); } }
@keyframes slideOut { to { opacity: 0; transform: translateX(100%); } }
</style>

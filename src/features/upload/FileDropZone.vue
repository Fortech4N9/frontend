<script setup lang="ts">
import { ref } from 'vue'
import { Upload, FileCode } from 'lucide-vue-next'

const emit = defineEmits<{ drop: [file: File] }>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.name.endsWith('.c')) {
    emit('drop', file)
  }
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    emit('drop', file)
    target.value = ''
  }
}
</script>

<template>
  <div
    class="relative rounded-xl border-2 border-dashed transition-all duration-200 p-8 text-center cursor-pointer"
    :class="isDragging
      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
      : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="fileInput?.click()"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".c"
      class="hidden"
      @change="onFileSelect"
    />
    <div class="flex flex-col items-center gap-3">
      <div class="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
        <Upload v-if="!isDragging" :size="24" />
        <FileCode v-else :size="24" />
      </div>
      <div>
        <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {{ isDragging ? 'Отпустите файл здесь' : 'Перетащите .c файл или нажмите для выбора' }}
        </p>
        <p class="text-xs text-zinc-400 mt-1">Поддерживаются файлы с расширением .c</p>
      </div>
    </div>
  </div>
</template>

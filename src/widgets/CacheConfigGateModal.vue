<script setup lang="ts">
defineProps<{
  open: boolean
}>()
defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="presentation"
      @click.self="$emit('close')"
    >
      <div
        class="max-w-md w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl"
        role="alertdialog"
        aria-labelledby="gate-title"
      >
        <h2 id="gate-title" class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
          Нужен конфиг симулятора кэша
        </h2>
        <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6">
          Для пайплайна анализа C/C нужно загрузить и выбрать <strong>JSON</strong>-файл (<code class="font-mono text-xs">.json</code>),
          сохранённые данные пробрасываются в событии <code class="font-mono text-xs">start_cache</code> полем
          <code class="font-mono text-xs">cache_config_s3_path</code>.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
            @click="$emit('close')"
          >
            Выбрать или загрузить конфиг
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

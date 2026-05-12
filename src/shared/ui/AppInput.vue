<script setup lang="ts">
import { cn } from '@/shared/lib/cn'

interface Props {
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  error?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  label: '',
  placeholder: '',
  error: '',
  disabled: false,
})

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {{ label }}
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="cn(
        'w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none',
        'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
        'placeholder:text-zinc-400',
        'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
        error
          ? 'border-red-500 focus:ring-red-500'
          : 'border-zinc-300 dark:border-zinc-700',
      )"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/shared/lib/cn'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
})

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
    {
      'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500': props.variant === 'primary',
      'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700': props.variant === 'secondary',
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': props.variant === 'danger',
      'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800': props.variant === 'ghost',
    },
    {
      'text-sm px-3 py-1.5': props.size === 'sm',
      'text-sm px-4 py-2': props.size === 'md',
      'text-base px-6 py-3': props.size === 'lg',
    },
  ),
)
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <button :class="classes" :disabled="disabled || loading">
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot />
  </button>
</template>

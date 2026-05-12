<script setup lang="ts">
import { ref } from 'vue'
import { AppToast } from '@/shared/ui'

const toastRef = ref<InstanceType<typeof AppToast> | null>(null)

function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toastRef.value?.addToast(message, type)
}

provide('toast', toast)
</script>

<script lang="ts">
import { provide } from 'vue'
</script>

<template>
  <RouterView />
  <AppToast ref="toastRef" />
</template>

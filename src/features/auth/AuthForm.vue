<script setup lang="ts">
import { ref, inject } from 'vue'
import { useAuthStore } from '@/entities/user'
import { AppButton, AppInput } from '@/shared/ui'

const props = defineProps<{ mode: 'login' | 'register' }>()

const auth = useAuthStore()
const toast = inject<(msg: string, type: string) => void>('toast')!

const email = ref('')
const password = ref('')
const errors = ref<{ email?: string; password?: string }>({})

function validate(): boolean {
  errors.value = {}
  if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
    errors.value.email = 'Введите корректный email'
  }
  if (!password.value) {
    errors.value.password = 'Введите пароль'
  } else if (props.mode === 'register' && password.value.length < 6) {
    errors.value.password = 'Минимум 6 символов'
  }
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    if (props.mode === 'login') {
      await auth.login({ email: email.value, password: password.value })
      toast('Вход выполнен', 'success')
    } else {
      await auth.register({ email: email.value, password: password.value })
      toast('Регистрация успешна', 'success')
    }
  } catch (e: any) {
    const msg = e.response?.data?.error || 'Произошла ошибка'
    toast(msg, 'error')
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <AppInput
      v-model="email"
      label="Email"
      type="email"
      placeholder="user@example.com"
      :error="errors.email"
    />
    <AppInput
      v-model="password"
      label="Пароль"
      type="password"
      placeholder="••••••••"
      :error="errors.password"
    />
    <AppButton class="w-full" size="lg" :loading="auth.loading">
      {{ mode === 'login' ? 'Войти' : 'Зарегистрироваться' }}
    </AppButton>
  </form>
</template>

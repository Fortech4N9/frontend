<script setup lang="ts">
import AuthForm from '@/features/auth/AuthForm.vue'
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-zinc-900 dark:text-white">Анализ кэша</h1>
        <p class="mt-2 text-zinc-500">Войдите в свой аккаунт</p>
      </div>
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8">
        <AuthForm mode="login" />
        <p class="mt-6 text-center text-sm text-zinc-500">
          Нет аккаунта?
          <RouterLink to="/register" class="text-indigo-600 hover:text-indigo-500 font-medium">
            Зарегистрироваться
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

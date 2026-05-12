<template>
  <div class="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
    <div class="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
      <h1 class="text-4xl font-bold text-zinc-900 dark:text-white mb-2">403</h1>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">Доступ к этой странице разрешен только администраторам.</p>
      <RouterLink
        to="/dashboard"
        class="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        На главную
      </RouterLink>
    </div>
  </div>
</template>

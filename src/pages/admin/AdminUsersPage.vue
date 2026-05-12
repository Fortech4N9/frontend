<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAdminStore } from '@/entities/admin'
import { useAuthStore, type User } from '@/entities/user'

const admin = useAdminStore()
const auth = useAuthStore()
const quotaDraft = ref<Record<string, number>>({})

onMounted(async () => {
  try {
    await admin.fetchUsers()
    admin.users.forEach((u) => {
      quotaDraft.value[u.id] = u.analysis_quota
    })
  } catch {
    // error text is stored in admin.error
  }
})

async function saveQuota(userId: string) {
  await admin.updateUserQuota(userId, quotaDraft.value[userId] ?? 0)
  await admin.fetchUsers(admin.usersPagination.page, admin.usersPagination.limit)
}

async function toggleActive(userId: string, isActive: boolean) {
  await admin.updateUserStatus(userId, !isActive)
  await admin.fetchUsers(admin.usersPagination.page, admin.usersPagination.limit)
}

function parseUserFromToken(token: string): User {
  const payload = token.split('.')[1]
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  const data = JSON.parse(atob(padded))
  return {
    id: data.user_id,
    email: data.email,
    role: data.role,
    analysis_quota: data.analysis_quota,
    is_active: data.is_active,
    created_at: new Date().toISOString(),
  }
}

async function impersonate(userId: string) {
  const token = await admin.impersonate(userId)
  const user = parseUserFromToken(token)
  auth.applyAuthToken(token, user)
  location.assign('/dashboard')
}
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Пользователи</h1>
      <p class="text-sm text-zinc-500 mt-1">Управление квотами, блокировкой и impersonation.</p>
    </div>

    <div
      v-if="admin.error"
      class="rounded-xl border border-rose-300 bg-rose-50 text-rose-700 px-4 py-3 text-sm"
    >
      {{ admin.error }}
    </div>

    <div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <table class="min-w-full text-sm">
        <thead class="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300">
          <tr>
            <th class="text-left px-4 py-3">Email</th>
            <th class="text-left px-4 py-3">Роль</th>
            <th class="text-left px-4 py-3">Квота/день</th>
            <th class="text-left px-4 py-3">Статус</th>
            <th class="text-left px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in admin.users"
            :key="u.id"
            class="border-t border-zinc-100 dark:border-zinc-800"
          >
            <td class="px-4 py-3 text-zinc-900 dark:text-white">{{ u.email }}</td>
            <td class="px-4 py-3">{{ u.role }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <input
                  v-model.number="quotaDraft[u.id]"
                  type="number"
                  min="0"
                  class="w-24 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1"
                />
                <button class="text-indigo-600 hover:text-indigo-700" @click="saveQuota(u.id)">
                  Сохранить
                </button>
              </div>
            </td>
            <td class="px-4 py-3">
              <span :class="u.is_active ? 'text-emerald-600' : 'text-rose-600'">
                {{ u.is_active ? 'Активен' : 'Заблокирован' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <button
                  class="text-sm"
                  :class="u.is_active ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'"
                  @click="toggleActive(u.id, u.is_active)"
                >
                  {{ u.is_active ? 'Заблокировать' : 'Разблокировать' }}
                </button>
                <button class="text-sm text-indigo-600 hover:text-indigo-700" @click="impersonate(u.id)">
                  Войти как
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="admin.loading" class="px-4 py-6 text-sm text-zinc-500">Загрузка пользователей...</div>
      <div v-else-if="admin.users.length === 0" class="px-4 py-6 text-sm text-zinc-500">Пользователи не найдены.</div>
    </div>
  </section>
</template>

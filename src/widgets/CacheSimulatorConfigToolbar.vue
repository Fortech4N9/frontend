<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import type { CacheSimulatorConfig } from '@/entities/analysis'
import { useAnalysisStore } from '@/entities/analysis'
import { useAuthStore } from '@/entities/user'
import { AppButton } from '@/shared/ui'
import { Settings2, Trash2, Upload } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
  }>(),
  { modelValue: null },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const toast = inject<(msg: string, type: string) => void>('toast')!

const analysisStore = useAnalysisStore()
const authStore = useAuthStore()

const configs = ref<CacheSimulatorConfig[]>([])
const loading = ref(false)
const uploadDialog = ref(false)
const uploadBusy = ref(false)
const cfgNameInput = ref('')
const cfgUploadInputRef = ref<HTMLInputElement | null>(null)

const selectedIdProxy = computed({
  get: () => props.modelValue ?? '',
  set: (v: string) => emit('update:modelValue', v === '' ? null : v),
})

const quotaHint = computed(() => {
  if (authStore.isAdmin) return 'Админ: без лимита на число конфигов'
  return `Не более 10 конфигов на аккаунт (${configs.value.length}/10)`
})

const atQuota = computed(
  () => !authStore.isAdmin && configs.value.length >= 10,
)

function pruneStaleSelection() {
  if (
    props.modelValue &&
    !configs.value.some((c) => c.id === props.modelValue)
  ) {
    emit('update:modelValue', null)
  }
}

async function reloadConfigs() {
  loading.value = true
  try {
    configs.value = await analysisStore.fetchCacheConfigs()
    pruneStaleSelection()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    toast(err.response?.data?.error || 'Не удалось загрузить конфиги', 'error')
  } finally {
    loading.value = false
  }
}

function restoreSelectionAfterLoad() {
  const pref = analysisStore.readPreferredCacheConfig()
  if (pref && configs.value.some((c) => c.id === pref)) {
    selectedIdProxy.value = pref
    return
  }
  if (
    configs.value.length === 1 &&
    (props.modelValue == null || props.modelValue === '') &&
    !analysisStore.readPreferredCacheConfig()
  ) {
    selectedIdProxy.value = configs.value[0]!.id
    analysisStore.persistPreferredCacheConfig(configs.value[0]!.id)
  }
}

watch(
  () => props.modelValue,
  (id) => analysisStore.persistPreferredCacheConfig(id),
)

async function deleteSelected() {
  const id = selectedIdProxy.value
  if (!id) return
  if (!confirm('Удалить выбранный конфиг симулятора? Он понадобится для новых анализов.')) {
    return
  }
  try {
    await analysisStore.deleteCacheConfig(id)
    toast('Конфиг удалён', 'success')
    selectedIdProxy.value = ''
    await reloadConfigs()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    toast(err.response?.data?.error || 'Не удалось удалить', 'error')
  }
}

function openUploadDialog() {
  if (atQuota.value) {
    toast('Достигнут лимит в 10 конфигов для обычного пользователя', 'error')
    return
  }
  cfgNameInput.value = ''
  uploadDialog.value = true
}

async function submitUpload(file: File) {
  uploadBusy.value = true
  try {
    const cfg = await analysisStore.uploadCacheConfig(file, cfgNameInput.value)
    toast('Конфиг загружен', 'success')
    uploadDialog.value = false
    await reloadConfigs()
    selectedIdProxy.value = cfg.id
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    toast(err.response?.data?.error || 'Ошибка загрузки конфига', 'error')
  } finally {
    uploadBusy.value = false
    if (cfgUploadInputRef.value) cfgUploadInputRef.value.value = ''
  }
}

function onPickConfigFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void submitUpload(file)
}

onMounted(async () => {
  await reloadConfigs()
  restoreSelectionAfterLoad()
})
</script>

<template>
  <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-4 mb-6">
    <div class="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
      <div class="flex-1 min-w-0">
        <label
          class="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-1.5"
        >
          <Settings2 class="w-4 h-4 shrink-0 text-indigo-500" />
          Конфиг симулятора кэша
        </label>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Без выбранного конфига анализ C/C не запускается. Принимаются только <strong>.json</strong>-файлы с валидным JSON; объект в MinIO, путь уходит в
          <code class="font-mono text-[11px]">start_cache</code>.
        </p>
        <select
          v-model="selectedIdProxy"
          class="w-full max-w-xl rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm px-3 py-2 text-zinc-900 dark:text-zinc-100"
          :disabled="loading"
        >
          <option value="">— Выберите конфиг —</option>
          <option v-for="c in configs" :key="c.id" :value="c.id">
            {{ c.display_name }} · {{ c.original_filename }}
          </option>
        </select>
        <p class="text-[11px] text-zinc-400 mt-1.5">{{ quotaHint }}</p>
      </div>
      <div class="flex flex-wrap gap-2 shrink-0">
        <AppButton type="button" size="sm" variant="secondary" :disabled="loading" @click="reloadConfigs">
          Обновить список
        </AppButton>
        <AppButton type="button" size="sm" :disabled="atQuota || loading" @click="openUploadDialog">
          <Upload class="w-3.5 h-3.5 mr-1.5" />
          Добавить конфиг
        </AppButton>
        <AppButton
          type="button"
          variant="ghost"
          size="sm"
          class="text-red-600 hover:text-red-700"
          :disabled="!selectedIdProxy"
          @click="deleteSelected"
        >
          <Trash2 class="w-3.5 h-3.5 mr-1.5" />
          Удалить
        </AppButton>
      </div>
    </div>

    <!-- Upload dialog -->
    <Teleport to="body">
      <div
        v-if="uploadDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        role="presentation"
        @click.self="uploadDialog = false"
      >
        <div
          class="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-5"
          role="dialog"
          aria-labelledby="upload-cfg-title"
        >
          <h2 id="upload-cfg-title" class="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
            Загрузка конфигурации
          </h2>
          <p class="text-xs text-zinc-500 mb-3 leading-relaxed">
            Только файл <strong>.json</strong> с корректным JSON внутри. До 256 KiB.
          </p>
          <input
            v-model.trim="cfgNameInput"
            placeholder="Подпись (необязательно)"
            type="text"
            class="mb-3 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
          />
          <input
            ref="cfgUploadInputRef"
            type="file"
            class="hidden"
            accept=".json,application/json"
            @change="onPickConfigFile"
          />
          <div class="flex gap-2 justify-end">
            <AppButton variant="ghost" size="sm" type="button" @click="uploadDialog = false">Отмена</AppButton>
            <AppButton
              size="sm"
              type="button"
              :loading="uploadBusy"
              @click="cfgUploadInputRef?.click()"
            >
              Выбрать файл
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>


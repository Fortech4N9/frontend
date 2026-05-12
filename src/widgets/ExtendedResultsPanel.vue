<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Activity,
  AlertTriangle,
  ArrowDownAZ,
  Database,
  Download,
  Filter,
  HardDrive,
  Recycle,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-vue-next'
import {
  STATUS_LABELS,
  type AggregatedPattern,
  type AnalysisMetrics,
  type TaskStatus,
} from '@/entities/analysis'
import {
  patternLabel,
  patternQuality,
  patternSuggestion,
  qualityBadgeClass,
} from '@/shared/lib/patternClassification'

const props = withDefaults(
  defineProps<{
    taskId: string
    status?: TaskStatus
    metrics?: AnalysisMetrics | null
    patterns: AggregatedPattern[]
    errorMessage?: string | null
    reusedFromTaskId?: string | null
    loading?: boolean
  }>(),
  {
    status: undefined,
    metrics: null,
    errorMessage: null,
    reusedFromTaskId: null,
    loading: false,
  },
)

// Локальные фильтры по pattern_type и cache_level. Когда динамика прислала
// строки для обоих уровней, нам важно показать L1/L2 отдельно, потому что
// миссы в L1 — поверхностные, а реальная стоимость доступа — это L2.
const selectedTypes = ref<Set<string>>(new Set())
const selectedLevel = ref<'all' | 'L1' | 'L2'>('all')

const patternTypes = computed(() => {
  const seen = new Map<string, number>()
  for (const p of props.patterns) {
    seen.set(p.pattern_type, (seen.get(p.pattern_type) ?? 0) + 1)
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }))
})

const cacheLevels = computed(() => {
  const levels = new Set<string>()
  for (const p of props.patterns) {
    if (p.cache_level) levels.add(p.cache_level)
  }
  return [...levels].sort()
})

function toggleType(type: string) {
  const next = new Set(selectedTypes.value)
  if (next.has(type)) next.delete(type)
  else next.add(type)
  selectedTypes.value = next
}

const filteredPatterns = computed(() => {
  return props.patterns.filter((p) => {
    if (selectedTypes.value.size > 0 && !selectedTypes.value.has(p.pattern_type)) {
      return false
    }
    if (selectedLevel.value !== 'all' && p.cache_level !== selectedLevel.value) {
      return false
    }
    return true
  })
})

const sortedPatterns = computed(() => {
  // Сортируем по misses_total — самые «дорогие» строки сверху, чтобы
  // пользователь сразу видел, где переписывать код.
  return [...filteredPatterns.value].sort((a, b) => {
    if (b.misses_total !== a.misses_total) {
      return b.misses_total - a.misses_total
    }
    return a.source_line - b.source_line
  })
})

const hasMetrics = computed(
  () =>
    props.metrics !== null &&
    props.metrics !== undefined &&
    props.metrics.total_memory_accesses > 0,
)

const aggregateMisses = computed(() => {
  // Когда динамики нет вовсе (cache stage упал), всё равно показываем хоть
  // что-то осмысленное — суммарные load_count/store_count из статики.
  let totalLoads = 0
  let totalStores = 0
  let totalWorkingSet = 0
  let totalMisses = 0
  for (const p of props.patterns) {
    if (p.cache_level === 'L1' || p.cache_level === '') {
      totalLoads += p.load_count
      totalStores += p.store_count
      totalWorkingSet += p.working_set_bytes
    }
    if (p.cache_level === 'L1') {
      totalMisses += p.misses_total
    }
  }
  return { totalLoads, totalStores, totalWorkingSet, totalMisses }
})

function formatStride(stride: number | null | undefined): string {
  if (stride === null || stride === undefined) return '—'
  if (Math.abs(stride - Math.round(stride)) < 1e-6) return String(Math.round(stride))
  return stride.toFixed(2)
}

function formatBytes(n: number): string {
  if (!n) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function shortFingerprint(fp: string): string {
  if (!fp) return ''
  return fp.length > 10 ? `${fp.slice(0, 10)}…` : fp
}

function rateColor(rate: number, invert = false): string {
  const good = invert ? rate < 0.3 : rate > 0.7
  const warn = invert ? rate < 0.6 : rate > 0.4
  if (good) return 'text-green-600 dark:text-green-400'
  if (warn) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function rateBg(rate: number, invert = false): string {
  const good = invert ? rate < 0.3 : rate > 0.7
  const warn = invert ? rate < 0.6 : rate > 0.4
  if (good) return 'bg-green-500'
  if (warn) return 'bg-yellow-500'
  return 'bg-red-500'
}

const emit = defineEmits<{ goto: [{ line: number; column: number }] }>()

function downloadJson() {
  const payload = {
    task_id: props.taskId,
    status: props.status,
    error_message: props.errorMessage,
    reused_from_task_id: props.reusedFromTaskId,
    metrics: props.metrics,
    patterns: props.patterns,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analysis-${props.taskId.slice(0, 8)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Заголовок + reuse + экспорт -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Результаты задачи
            <code class="font-mono text-[11px] text-zinc-400">{{ taskId.slice(0, 8) }}…</code>
          </h3>
          <span
            v-if="status"
            class="text-[10px] px-1.5 py-0.5 rounded tracking-wide font-semibold"
            :class="
              status === 'done'
                ? 'bg-green-100 dark:bg-green-950 text-green-600'
                : status === 'error'
                  ? 'bg-red-100 dark:bg-red-950 text-red-600'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600'
            "
          >
            {{ STATUS_LABELS[status] }}
          </span>
        </div>
        <p
          v-if="reusedFromTaskId"
          class="mt-1 flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400"
        >
          <Recycle :size="12" />
          Переиспользовано из задачи <code class="font-mono">{{ reusedFromTaskId.slice(0, 8) }}…</code>
        </p>
      </div>

      <button
        type="button"
        class="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
        @click="downloadJson"
      >
        <Download :size="12" /> JSON
      </button>
    </div>

    <!-- Ошибка воркера (если есть). Не закрывает остальное — статика тоже видна. -->
    <div
      v-if="errorMessage"
      class="rounded-xl border border-red-300/60 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5"
    >
      <div class="flex items-start gap-2.5">
        <AlertTriangle :size="16" class="mt-0.5 text-red-500 shrink-0" />
        <div class="min-w-0">
          <p class="text-xs font-semibold text-red-700 dark:text-red-300 mb-0.5">
            Ошибка анализа
          </p>
          <p class="text-xs text-red-600 dark:text-red-200 whitespace-pre-wrap leading-relaxed">
            {{ errorMessage }}
          </p>
          <p
            v-if="patterns.length > 0"
            class="text-[11px] text-red-500/80 dark:text-red-300/80 mt-1.5"
          >
            Статические паттерны всё равно собраны и доступны ниже.
          </p>
        </div>
      </div>
    </div>

    <!-- Карточки агрегата по L1 -->
    <div v-if="hasMetrics && metrics" class="grid grid-cols-3 gap-2.5">
      <div class="rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-3">
        <div class="flex items-center gap-1.5 mb-1">
          <div class="rounded-md p-1 bg-green-500/10">
            <TrendingUp :size="12" class="text-green-600 dark:text-green-400" />
          </div>
          <span class="text-[10px] text-zinc-500 uppercase tracking-wide">Доля попаданий</span>
        </div>
        <p :class="['text-lg font-bold', rateColor(metrics.hit_rate)]">
          {{ (metrics.hit_rate * 100).toFixed(1) }}%
        </p>
      </div>

      <div class="rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-3">
        <div class="flex items-center gap-1.5 mb-1">
          <div class="rounded-md p-1 bg-red-500/10">
            <TrendingDown :size="12" class="text-red-600 dark:text-red-400" />
          </div>
          <span class="text-[10px] text-zinc-500 uppercase tracking-wide">Доля промахов</span>
        </div>
        <p :class="['text-lg font-bold', rateColor(metrics.miss_rate, true)]">
          {{ (metrics.miss_rate * 100).toFixed(1) }}%
        </p>
      </div>

      <div class="rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-3">
        <div class="flex items-center gap-1.5 mb-1">
          <div class="rounded-md p-1 bg-purple-500/10">
            <Zap :size="12" class="text-purple-600 dark:text-purple-400" />
          </div>
          <span class="text-[10px] text-zinc-500 uppercase tracking-wide">Оценка</span>
        </div>
        <p class="text-lg font-bold text-zinc-900 dark:text-white">
          {{ metrics.optimization_score.toFixed(1) }}
        </p>
      </div>
    </div>

    <!-- Расширенный блок счётчиков -->
    <div
      v-if="hasMetrics && metrics"
      class="rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-3.5 space-y-2"
    >
      <h4 class="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
        Кэш-симуляция (L1)
      </h4>
      <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div class="flex justify-between">
          <span class="flex items-center gap-1.5 text-zinc-500">
            <Activity :size="12" class="text-indigo-500" />
            Всего обращений
          </span>
          <span class="text-zinc-900 dark:text-white font-medium tabular-nums">
            {{ metrics.total_memory_accesses.toLocaleString() }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-1.5 text-zinc-500">
            <TrendingUp :size="12" class="text-green-500" />
            Попаданий
          </span>
          <span class="text-green-600 dark:text-green-400 font-medium tabular-nums">
            {{ metrics.cache_hits.toLocaleString() }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-1.5 text-zinc-500">
            <TrendingDown :size="12" class="text-red-500" />
            Промахов
          </span>
          <span class="text-red-600 dark:text-red-400 font-medium tabular-nums">
            {{ metrics.cache_misses.toLocaleString() }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-1.5 text-zinc-500">
            <HardDrive :size="12" class="text-zinc-400" />
            Рабочий набор
          </span>
          <span class="text-zinc-900 dark:text-white font-medium tabular-nums">
            {{ formatBytes(aggregateMisses.totalWorkingSet) }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-1.5 text-zinc-500">
            <Database :size="12" class="text-zinc-400" />
            Чтений / записей
          </span>
          <span class="text-zinc-900 dark:text-white font-medium tabular-nums">
            {{ aggregateMisses.totalLoads.toLocaleString() }} / {{ aggregateMisses.totalStores.toLocaleString() }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-1.5 text-zinc-500">
            <Filter :size="12" class="text-zinc-400" />
            Паттернов всего
          </span>
          <span class="text-zinc-900 dark:text-white font-medium tabular-nums">
            {{ patterns.length }}
          </span>
        </div>
      </div>

      <div class="space-y-1.5 pt-1">
        <div class="space-y-0.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-zinc-500">Попадания</span>
            <span :class="rateColor(metrics.hit_rate)">
              {{ (metrics.hit_rate * 100).toFixed(1) }}%
            </span>
          </div>
          <div class="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all duration-1000', rateBg(metrics.hit_rate)]"
              :style="{ width: `${metrics.hit_rate * 100}%` }"
            />
          </div>
        </div>
        <div class="space-y-0.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-zinc-500">Промахи</span>
            <span :class="rateColor(metrics.miss_rate, true)">
              {{ (metrics.miss_rate * 100).toFixed(1) }}%
            </span>
          </div>
          <div class="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all duration-1000', rateBg(metrics.miss_rate, true)]"
              :style="{ width: `${metrics.miss_rate * 100}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Фильтры паттернов -->
    <div
      v-if="patterns.length > 0"
      class="rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-3 space-y-2"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">Типы:</span>
        <button
          v-for="t in patternTypes"
          :key="t.type"
          type="button"
          class="text-[11px] px-2 py-0.5 rounded-full border transition cursor-pointer"
          :class="
            selectedTypes.has(t.type)
              ? `${qualityBadgeClass(patternQuality(t.type))} border-current/40 font-semibold`
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          "
          @click="toggleType(t.type)"
        >
          <span class="truncate max-w-[10rem]" :title="t.type">{{ patternLabel(t.type) }}</span>
          · {{ t.count }}
        </button>
        <button
          v-if="selectedTypes.size > 0"
          type="button"
          class="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
          @click="selectedTypes = new Set()"
        >
          Сбросить
        </button>
      </div>

      <div v-if="cacheLevels.length > 1" class="flex items-center gap-2">
        <span class="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">Кэш:</span>
        <button
          type="button"
          class="text-[11px] px-2 py-0.5 rounded-full border transition cursor-pointer"
          :class="
            selectedLevel === 'all'
              ? 'bg-indigo-500/10 border-indigo-400/40 text-indigo-600 dark:text-indigo-300 font-semibold'
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          "
          @click="selectedLevel = 'all'"
        >
          Все
        </button>
        <button
          v-for="lvl in cacheLevels"
          :key="lvl"
          type="button"
          class="text-[11px] px-2 py-0.5 rounded-full border transition cursor-pointer"
          :class="
            selectedLevel === lvl
              ? 'bg-indigo-500/10 border-indigo-400/40 text-indigo-600 dark:text-indigo-300 font-semibold'
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          "
          @click="selectedLevel = (lvl as 'L1' | 'L2')"
        >
          {{ lvl }}
        </button>
      </div>
    </div>

    <!-- Таблица паттернов -->
    <div
      v-if="patterns.length > 0"
      class="rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 overflow-hidden"
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700/60">
        <h4 class="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
          <ArrowDownAZ :size="12" /> Паттерны доступа ({{ sortedPatterns.length }})
        </h4>
      </div>
      <div class="overflow-x-auto max-h-[420px]">
        <table class="w-full text-[11px]">
          <thead class="sticky top-0 bg-zinc-50 dark:bg-zinc-800 z-10">
            <tr class="text-left text-zinc-500 dark:text-zinc-400">
              <th class="px-2 py-2 font-medium">#</th>
              <th class="px-2 py-2 font-medium">Строка</th>
              <th class="px-2 py-2 font-medium">Функция</th>
              <th class="px-2 py-2 font-medium">Символ</th>
              <th class="px-2 py-2 font-medium">Паттерн</th>
              <th class="px-2 py-2 font-medium">Шаг</th>
              <th class="px-2 py-2 font-medium">Глуб.</th>
              <th class="px-2 py-2 font-medium">Заполн.</th>
              <th class="px-2 py-2 font-medium">Кэш</th>
              <th class="px-2 py-2 font-medium text-right">Промахи</th>
              <th class="px-2 py-2 font-medium text-right">Чт./зап.</th>
              <th class="px-2 py-2 font-medium">РБ</th>
              <th class="px-2 py-2 font-medium">Завис.</th>
              <th class="px-2 py-2 font-medium">Отпечаток</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(p, idx) in sortedPatterns"
              :key="`${p.sequence_index}-${p.cache_level}-${idx}`"
              class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition"
              :title="patternSuggestion(p.pattern_type, p.dependence)"
              @click="$emit('goto', { line: p.source_line, column: p.source_column })"
            >
              <td class="px-2 py-1.5 text-zinc-400 tabular-nums">{{ p.sequence_index }}</td>
              <td class="px-2 py-1.5 text-zinc-700 dark:text-zinc-200 tabular-nums">
                {{ p.source_line }}:{{ p.source_column }}
              </td>
              <td class="px-2 py-1.5 text-zinc-600 dark:text-zinc-300">
                <code class="font-mono">{{ p.function || '—' }}</code>
              </td>
              <td class="px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                <code class="font-mono">{{ p.base_symbol }}</code>
                <span v-if="p.base_kind" class="text-[10px] text-zinc-400 ml-1">{{ p.base_kind }}</span>
              </td>
              <td class="px-2 py-1.5">
                <span
                  class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  :class="qualityBadgeClass(patternQuality(p.pattern_type))"
                  :title="`${p.pattern_type} — ${patternLabel(p.pattern_type)}`"
                >
                  {{ patternLabel(p.pattern_type) }}
                </span>
              </td>
              <td class="px-2 py-1.5 text-zinc-600 dark:text-zinc-300 tabular-nums">
                {{ formatStride(p.stride) }}
              </td>
              <td class="px-2 py-1.5 text-zinc-500 tabular-nums">{{ p.depth }}</td>
              <td class="px-2 py-1.5 text-zinc-600 dark:text-zinc-300 tabular-nums">
                {{ (p.fill_factor * 100).toFixed(0) }}%
              </td>
              <td class="px-2 py-1.5">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  :class="
                    p.cache_level === 'L1'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : p.cache_level === 'L2'
                        ? 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  "
                >
                  {{ p.cache_level || '—' }}
                </span>
              </td>
              <td
                class="px-2 py-1.5 text-right font-semibold tabular-nums"
                :class="
                  p.misses_total > 1000
                    ? 'text-red-600 dark:text-red-400'
                    : p.misses_total > 100
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-zinc-600 dark:text-zinc-300'
                "
              >
                {{ p.misses_total.toLocaleString() }}
              </td>
              <td class="px-2 py-1.5 text-right text-zinc-500 tabular-nums">
                {{ p.misses_read.toLocaleString() }} / {{ p.misses_write.toLocaleString() }}
              </td>
              <td class="px-2 py-1.5 text-zinc-500">{{ formatBytes(p.working_set_bytes) }}</td>
              <td class="px-2 py-1.5 text-zinc-500">{{ p.dependence || '—' }}</td>
              <td class="px-2 py-1.5 text-zinc-400">
                <code
                  class="font-mono text-[10px]"
                  :title="p.pattern_fingerprint"
                >
                  {{ shortFingerprint(p.pattern_fingerprint) }}
                </code>
              </td>
            </tr>
            <tr v-if="sortedPatterns.length === 0">
              <td colspan="14" class="px-3 py-6 text-center text-zinc-400 text-[11px]">
                Под выбранные фильтры ничего не подходит.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Пусто, но без ошибки -->
    <div
      v-else-if="!loading && !errorMessage"
      class="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700/50 p-6 text-center"
    >
      <p class="text-xs text-zinc-500">
        Подробные паттерны пока недоступны. Дождитесь завершения статического анализа.
      </p>
    </div>
  </div>
</template>

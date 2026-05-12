<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import { useAdminStore } from '@/entities/admin'
import { ensureChartsRegistered } from '@/shared/lib/chartSetup'
import {
  patternLabel,
  patternQuality,
  qualityBadgeClass,
  qualityColor,
} from '@/shared/lib/patternClassification'

ensureChartsRegistered()

const admin = useAdminStore()

const cards = computed(() => [
  { title: 'Всего пользователей', value: admin.coreStats?.total_users ?? 0 },
  { title: 'Всего проектов', value: admin.coreStats?.total_projects ?? 0 },
  { title: 'Завершено анализов', value: admin.analysisStats?.done ?? 0 },
  { title: 'Загружено файлов', value: admin.analysisStats?.total_files ?? 0 },
])

// totalPatterns — сумма счётчиков по всем категориям. Используется для
// расчёта долей в Doughnut и для прогресс-баров в верхнем списке top-5.
const totalPatterns = computed(() =>
  admin.topPatterns.reduce((sum, row) => sum + row.count, 0),
)

const sortedPatterns = computed(() =>
  [...admin.topPatterns].sort((a, b) => b.count - a.count),
)

const topFive = computed(() => sortedPatterns.value.slice(0, 5))

// Сводка по «качеству»: сколько строк в каждой категории. Это полезный сводный
// индикатор «насколько код в системе оптимален в среднем».
const qualityBreakdown = computed(() => {
  const buckets = { good: 0, warn: 0, bad: 0, neutral: 0 }
  for (const row of admin.topPatterns) {
    buckets[patternQuality(row.pattern_type)] += row.count
  }
  return buckets
})

const barData = computed(() => {
  const labels = sortedPatterns.value.map((row) => row.pattern_type)
  const counts = sortedPatterns.value.map((row) => row.count)
  const colors = sortedPatterns.value.map((row) => qualityColor(patternQuality(row.pattern_type)))
  return {
    labels,
    datasets: [
      {
        label: 'Кол-во строк в static_patterns',
        data: counts,
        backgroundColor: colors,
        borderColor: colors,
        borderRadius: 6,
        barThickness: 18,
      },
    ],
  }
})

const barOptions = computed(() => ({
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items: any[]) => {
          const label = items[0]?.label || ''
          return `${label} — ${patternLabel(label)}`
        },
        label: (item: any) => {
          const value = Number(item.parsed?.x ?? 0)
          const total = totalPatterns.value || 1
          const share = ((value / total) * 100).toFixed(1)
          return `Кол-во: ${value.toLocaleString()} (${share}%)`
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { precision: 0 },
      grid: { display: true, color: 'rgba(120,120,140,0.15)' },
    },
    y: {
      ticks: { font: { size: 11 } },
      grid: { display: false },
    },
  },
}))

const doughnutData = computed(() => {
  const labels = sortedPatterns.value.map((row) => row.pattern_type)
  const counts = sortedPatterns.value.map((row) => row.count)
  const colors = sortedPatterns.value.map((row) => qualityColor(patternQuality(row.pattern_type)))
  return {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: colors,
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
      },
    ],
  }
})

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        boxWidth: 10,
        font: { size: 11 },
      },
    },
    tooltip: {
      callbacks: {
        label: (item: any) => {
          const raw = item.label || ''
          const value = Number(item.parsed ?? 0)
          const total = totalPatterns.value || 1
          const share = ((value / total) * 100).toFixed(1)
          return `${patternLabel(raw)} (${raw}): ${value.toLocaleString()} (${share}%)`
        },
      },
    },
  },
}))

const qualityChartData = computed(() => ({
  labels: ['Хорошие', 'Средние', 'Проблемные', 'Прочие'],
  datasets: [
    {
      data: [
        qualityBreakdown.value.good,
        qualityBreakdown.value.warn,
        qualityBreakdown.value.bad,
        qualityBreakdown.value.neutral,
      ],
      backgroundColor: [
        qualityColor('good'),
        qualityColor('warn'),
        qualityColor('bad'),
        qualityColor('neutral'),
      ],
      borderColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1,
    },
  ],
}))

onMounted(async () => {
  await Promise.all([
    admin.fetchCoreStats(),
    admin.fetchAnalysisStats(),
    admin.fetchTopPatterns(15),
  ])
})
</script>

<template>
  <section class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Дашборд администратора</h1>
      <p class="text-sm text-zinc-500 mt-1">
        Глобальные метрики по пользователям, проектам и анализам.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <article
        v-for="card in cards"
        :key="card.title"
        class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
      >
        <p class="text-sm text-zinc-500">{{ card.title }}</p>
        <p class="text-3xl font-bold text-zinc-900 dark:text-white mt-2">{{ card.value }}</p>
      </article>
    </div>

    <!-- Top patterns charts -->
    <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">
            Самые частые паттерны доступа (ClickHouse)
          </h2>
          <p class="text-xs text-zinc-500 mt-0.5">
            Источник: <code class="font-mono">static_patterns.pattern_type</code> по всем задачам.
          </p>
        </div>
        <div class="text-xs text-zinc-500">
          Всего строк: <span class="font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">{{ totalPatterns.toLocaleString() }}</span>
        </div>
      </div>

      <div v-if="admin.topPatterns.length === 0" class="text-sm text-zinc-500 py-8 text-center">
        Нет данных. Запустите хотя бы один анализ — статика появится в ClickHouse.
      </div>

      <div v-else class="space-y-5">
        <!-- Top-5 список с прогресс-барами: быстро глазом, без графики -->
        <div class="space-y-1.5">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Топ-5</h3>
          <div
            v-for="row in topFive"
            :key="row.pattern_type"
            class="grid grid-cols-[160px_1fr_60px] items-center gap-3 text-xs"
          >
            <span
              class="inline-flex items-center justify-start gap-1.5"
              :title="patternLabel(row.pattern_type)"
            >
              <span
                class="inline-block w-2 h-2 rounded-full"
                :style="{ background: qualityColor(patternQuality(row.pattern_type)) }"
              />
              <code class="font-mono text-zinc-700 dark:text-zinc-200">{{ row.pattern_type }}</code>
            </span>
            <div class="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: `${totalPatterns ? (row.count / totalPatterns) * 100 : 0}%`,
                  background: qualityColor(patternQuality(row.pattern_type)),
                }"
              />
            </div>
            <span class="text-right font-semibold text-zinc-900 dark:text-white tabular-nums">
              {{ row.count.toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- Графики -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div class="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Распределение по pattern_type
            </h3>
            <div class="h-[320px]">
              <Bar :data="barData" :options="barOptions" />
            </div>
          </div>

          <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-4 flex flex-col">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Доли паттернов
            </h3>
            <div class="flex-1 min-h-[260px]">
              <Doughnut :data="doughnutData" :options="doughnutOptions" />
            </div>
          </div>
        </div>

        <!-- Сводка по «качеству» -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-4 md:col-span-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Качество паттернов (агрегировано)
            </h3>
            <div class="h-[180px]">
              <Doughnut :data="qualityChartData" :options="doughnutOptions" />
            </div>
          </div>

          <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-4 space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
              Условные обозначения
            </h3>
            <div class="space-y-1.5 text-xs">
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-3 h-3 rounded-full"
                  :style="{ background: qualityColor('good') }"
                />
                <span class="text-zinc-600 dark:text-zinc-300">
                  Хорошие — <code class="font-mono">unit_stride</code>, <code class="font-mono">constant</code>
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-3 h-3 rounded-full"
                  :style="{ background: qualityColor('warn') }"
                />
                <span class="text-zinc-600 dark:text-zinc-300">
                  Средние — <code class="font-mono">non_unit_stride</code>, <code class="font-mono">broadcast</code>
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-3 h-3 rounded-full"
                  :style="{ background: qualityColor('bad') }"
                />
                <span class="text-zinc-600 dark:text-zinc-300">
                  Проблемные — <code class="font-mono">gather_scatter</code>, <code class="font-mono">indirect</code>, <code class="font-mono">random</code>
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-3 h-3 rounded-full"
                  :style="{ background: qualityColor('neutral') }"
                />
                <span class="text-zinc-600 dark:text-zinc-300">Прочие — не классифицированы</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Полная сводная таблица всех собранных pattern_type -->
        <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            Все pattern_type
          </h3>
          <ul class="space-y-1.5">
            <li
              v-for="row in sortedPatterns"
              :key="row.pattern_type"
              class="flex items-center justify-between text-xs"
            >
              <span class="inline-flex items-center gap-2">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  :class="qualityBadgeClass(patternQuality(row.pattern_type))"
                >
                  {{ row.pattern_type }}
                </span>
                <span class="text-zinc-400 hidden sm:inline">{{ patternLabel(row.pattern_type) }}</span>
              </span>
              <span class="font-semibold text-zinc-900 dark:text-white tabular-nums">
                {{ row.count.toLocaleString() }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

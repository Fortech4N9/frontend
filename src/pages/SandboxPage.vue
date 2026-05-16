<script setup lang="ts">
import { ref, shallowRef, inject, computed, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import type { editor as MonacoEditor } from 'monaco-editor'

import AppHeader from '@/widgets/AppHeader.vue'
import CacheSimulatorConfigToolbar from '@/widgets/CacheSimulatorConfigToolbar.vue'
import CacheConfigGateModal from '@/widgets/CacheConfigGateModal.vue'
import ExtendedResultsPanel from '@/widgets/ExtendedResultsPanel.vue'
import { AppButton } from '@/shared/ui'
import {
  useAnalysisStore,
  STATUS_LABELS,
  type AggregatedPattern,
  type AnalysisMetrics,
  type AnalysisTask,
  type ProjectFile,
  type TaskStatus,
} from '@/entities/analysis'
import {
  patternLabel,
  patternQuality,
  patternSuggestion,
  qualityColor,
} from '@/shared/lib/patternClassification'
import { useProjectStore } from '@/entities/project'
import { useThemeStore } from '@/entities/theme'
import {
  Play,
  Trash2,
  FolderOpen,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCode,
  FilePlus,
  RefreshCw,
} from 'lucide-vue-next'

const toast = inject<(msg: string, type: string) => void>('toast')!

const analysisStore = useAnalysisStore()
const projectStore = useProjectStore()
const themeStore = useThemeStore()

const monacoTheme = computed(() => (themeStore.theme === 'dark' ? 'vs-dark' : 'vs'))

const DEFAULT_CODE = `#include <stdio.h>\n#define N 1024\n\ndouble a[N], b[N];\n\nint main() {\n    for (int i = 0; i < N; i++) {\n        a[i] = b[i] + 1.0;\n    }\n    return 0;\n}\n`

const code = ref(DEFAULT_CODE)
const fileName = ref('input.c')
const analyzing = ref(false)
const currentStatus = ref<TaskStatus | null>(null)
const metrics = ref<AnalysisMetrics | null>(null)
const patterns = ref<AggregatedPattern[]>([])
const errorMessage = ref<string | null>(null)
const reusedFromTaskId = ref<string | null>(null)
const currentTaskId = ref<string | null>(null)

const LS_SANDBOX_PROJECT = 'sandbox_selected_project_id'
const selectedProjectId = ref('')
const selectedCacheConfigId = ref<string | null>(null)
const showConfigGateModal = ref(false)

// Источник правды для повторного анализа: если выбран файл из sidebar, помним
// его id и содержимое в момент загрузки. Если содержимое в редакторе совпадает —
// дёргаем `analyzeExistingFile(file_id)` (без upload). Если поменяли —
// делаем upload (бэкенд сам дедуплицирует по project_id + filename + sha256).
const currentFileId = ref<string | null>(null)
const loadedContent = ref<string | null>(null)

const editorRef = shallowRef<MonacoEditor.IStandaloneCodeEditor>()
const monacoRef = shallowRef<typeof import('monaco-editor')>()
const currentDecorations = shallowRef<string[]>([])

const projectFiles = ref<ProjectFile[]>([])
const filesLoading = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

function handleEditorMount(editor: MonacoEditor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) {
  editorRef.value = editor
  monacoRef.value = monaco
}

const statusSteps = computed(() => {
  const s = currentStatus.value
  if (!s) return []
  return [
    { label: 'Загрузка', done: true, active: false },
    { label: 'Статический анализ', done: ['static_done', 'cache_running', 'done'].includes(s), active: s === 'static_running' },
    { label: 'Кэш-симуляция', done: s === 'done', active: s === 'cache_running' },
    { label: 'Готово', done: s === 'done', active: false },
  ]
})

const isRunning = computed(() =>
  !!currentStatus.value && ['pending', 'static_running', 'static_done', 'cache_running'].includes(currentStatus.value),
)

const isFileUnchanged = computed(
  () => currentFileId.value !== null && loadedContent.value !== null && code.value === loadedContent.value,
)

function persistSandboxProjectChoice(id: string) {
  try {
    if (!id.trim()) {
      localStorage.removeItem(LS_SANDBOX_PROJECT)
      return
    }
    localStorage.setItem(LS_SANDBOX_PROJECT, id)
  } catch {
    /* ignore */
  }
}

function readSandboxProjectChoice(): string | null {
  try {
    return localStorage.getItem(LS_SANDBOX_PROJECT)?.trim() || null
  } catch {
    return null
  }
}

function syncSandboxProjectFromList() {
  const list = projectStore.projects
  if (!list.length) {
    selectedProjectId.value = ''
    projectFiles.value = []
    persistSandboxProjectChoice('')
    return
  }
  const stored = readSandboxProjectChoice()
  if (stored && list.some((p) => p.id === stored)) {
    selectedProjectId.value = stored
    return
  }
  selectedProjectId.value = list[0]!.id
  persistSandboxProjectChoice(selectedProjectId.value)
}

watch(selectedProjectId, async (pid) => {
  if (!pid) {
    projectFiles.value = []
    return
  }
  persistSandboxProjectChoice(pid)
  await refreshFiles()
})

async function refreshFiles() {
  if (!selectedProjectId.value) {
    projectFiles.value = []
    return
  }
  filesLoading.value = true
  try {
    projectFiles.value = await analysisStore.fetchProjectFiles(selectedProjectId.value)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    toast(err.response?.data?.error || 'Не удалось загрузить список файлов', 'error')
  } finally {
    filesLoading.value = false
  }
}
async function loadFileFromList(file: ProjectFile) {
  try {
    const content = await analysisStore.fetchFileContent(file.id)
    code.value = content
    loadedContent.value = content
    currentFileId.value = file.id
    fileName.value = file.filename
    clearResults()
    toast(`Открыт файл ${file.filename}`, 'info')
  } catch (e: any) {
    toast(e.response?.data?.error || 'Не удалось открыть файл', 'error')
  }
}

async function removeFileFromList(f: ProjectFile) {
  if (
    !confirm(
      `Убрать «${f.filename}» из списка? Объект в хранилище сохранится, но файл здесь отображаться не будет.`,
    )
  ) {
    return
  }
  try {
    await analysisStore.deleteProjectFile(f.id)
    if (currentFileId.value === f.id) {
      newEmptyFile()
    }
    await refreshFiles()
    toast('Файл скрыт из списка проекта', 'success')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    toast(err.response?.data?.error || 'Не удалось скрыть файл', 'error')
  }
}

function newEmptyFile() {
  code.value = DEFAULT_CODE
  fileName.value = 'input.c'
  currentFileId.value = null
  loadedContent.value = null
  clearResults()
}

async function runAnalysis() {
  if (!code.value.trim()) {
    toast('Напишите или загрузите C-код для анализа', 'error')
    return
  }
  if (!selectedProjectId.value) {
    toast('Сначала создайте проект и выберите его в списке', 'error')
    return
  }
  if (!selectedCacheConfigId.value) {
    showConfigGateModal.value = true
    toast('Выберите или загрузите конфиг симулятора кэша', 'error')
    return
  }

  analyzing.value = true
  metrics.value = null
  patterns.value = []
  errorMessage.value = null
  reusedFromTaskId.value = null
  currentTaskId.value = null
  currentStatus.value = 'pending'
  clearDecorations()

  try {
    const projectId = selectedProjectId.value
    const cacheCfg = selectedCacheConfigId.value!

    let task: AnalysisTask
    if (isFileUnchanged.value && currentFileId.value) {
      task = await analysisStore.analyzeExistingFile(currentFileId.value, cacheCfg)
    } else {
      const blob = new Blob([code.value], { type: 'text/x-csrc' })
      const file = new File([blob], fileName.value, { type: 'text/x-csrc' })
      task = await analysisStore.uploadFile(projectId, file, cacheCfg)

      await refreshFiles()
      const matched = projectFiles.value.find((f) => f.id === task.file_id)
      if (matched) {
        currentFileId.value = matched.id
        loadedContent.value = code.value
      }
    }

    currentTaskId.value = task.id
    currentStatus.value = task.status

    const result = await pollUntilDone(task.id)

    errorMessage.value = result.error_message?.trim() ? result.error_message : null
    reusedFromTaskId.value = result.reused_from_task_id?.trim()
      ? result.reused_from_task_id
      : null

    // Даже когда задача в error, статика и /aggregated часто всё равно
    // что-то отдают (например, если упал только cache stage из-за float).
    const [metricsResult, aggResult] = await Promise.allSettled([
      analysisStore.fetchTaskMetrics(task.id),
      analysisStore.fetchTaskAggregated(task.id),
    ])
    if (metricsResult.status === 'fulfilled') metrics.value = metricsResult.value
    if (aggResult.status === 'fulfilled') patterns.value = aggResult.value

    if (patterns.value.length === 0) {
      try {
        patterns.value = await analysisStore.fetchTaskStaticPatterns(task.id)
      } catch {
        // ignore
      }
    }

    if (result.status === 'done') {
      currentStatus.value = 'done'
      applyPatternDecorations()
      const hit = metrics.value ? (metrics.value.hit_rate * 100).toFixed(1) : '0.0'
      toast(`Анализ завершён — доля попаданий в кэш: ${hit}%`, 'success')
    } else {
      currentStatus.value = 'error'
      applyPatternDecorations()
      toast(errorMessage.value || 'Анализ завершился с ошибкой', 'error')
    }
  } catch (e: unknown) {
    currentStatus.value = 'error'
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    toast(err.response?.data?.error || err.message || 'Ошибка анализа', 'error')
  } finally {
    analyzing.value = false
    refreshFiles().catch(() => {})
  }
}

async function pollUntilDone(taskId: string) {
  const terminalStatuses: TaskStatus[] = ['done', 'error']
  while (true) {
    await new Promise((r) => setTimeout(r, 2500))
    const task = await analysisStore.fetchTaskStatus(taskId)
    currentStatus.value = task.status
    if (terminalStatuses.includes(task.status)) return task
  }
}

function applyPatternDecorations() {
  const editor = editorRef.value
  const monaco = monacoRef.value
  if (!editor || !monaco) return

  if (patterns.value.length === 0) {
    if (metrics.value) {
      applyMetricsSummaryDecoration(metrics.value)
    }
    return
  }

  // Группируем по строке исходника: для одной и той же строки может прийти
  // несколько строк AggregatedEntry — например, для L1 и для L2, либо несколько
  // обращений к разным символам. Выбираем самую «дорогую» (по misses_total),
  // а в hover-message выкладываем все.
  const byLine = new Map<number, AggregatedPattern[]>()
  for (const p of patterns.value) {
    if (p.source_line <= 0) continue
    const arr = byLine.get(p.source_line) ?? []
    arr.push(p)
    byLine.set(p.source_line, arr)
  }

  const decorations: MonacoEditor.IModelDeltaDecoration[] = []
  for (const [line, group] of byLine) {
    const worst = group.reduce((a, b) => {
      const qa = patternQuality(a.pattern_type)
      const qb = patternQuality(b.pattern_type)
      const score = { good: 0, neutral: 1, warn: 2, bad: 3 }
      if (score[qb] !== score[qa]) return score[qb] > score[qa] ? b : a
      return b.misses_total > a.misses_total ? b : a
    })

    const quality = patternQuality(worst.pattern_type)
    const className =
      quality === 'bad'
        ? 'line-decoration-bad'
        : quality === 'warn'
          ? 'line-decoration-warn'
          : quality === 'good'
            ? 'line-decoration-good'
            : 'line-decoration-neutral'
    const glyphClass =
      quality === 'bad'
        ? 'glyph-bad'
        : quality === 'warn'
          ? 'glyph-warn'
          : quality === 'good'
            ? 'glyph-good'
            : 'glyph-neutral'

    const hoverLines: string[] = [`**Паттерны на строке ${line}**`, '']
    for (const p of group) {
      hoverLines.push(`### \`${p.base_symbol}\` — \`${p.pattern_type}\` ${p.cache_level ? `(${p.cache_level})` : ''}`)
      hoverLines.push('')
      hoverLines.push('| Поле | Значение |')
      hoverLines.push('|:---|:---|')
      hoverLines.push(`| Функция | \`${p.function || '—'}\` |`)
      hoverLines.push(`| Шаг | ${p.stride ?? '—'} |`)
      hoverLines.push(`| Глубина | ${p.depth} |`)
      hoverLines.push(`| Коэф. заполнения | ${(p.fill_factor * 100).toFixed(0)}% |`)
      hoverLines.push(`| Чтений / записей | ${p.load_count} / ${p.store_count} |`)
      hoverLines.push(`| Промахи (всего) | ${p.misses_total.toLocaleString()} |`)
      hoverLines.push(`| Промахи чт./зап. | ${p.misses_read.toLocaleString()} / ${p.misses_write.toLocaleString()} |`)
      if (p.dependence) hoverLines.push(`| Зависимость | ${p.dependence} |`)
      hoverLines.push('')
      hoverLines.push(`> ${patternLabel(p.pattern_type)} — ${patternSuggestion(p.pattern_type, p.dependence)}`)
      hoverLines.push('')
    }

    decorations.push({
      range: new monaco.Range(
        line,
        Math.max(1, worst.source_column || 1),
        line,
        Math.max(1, (worst.source_column || 1) + worst.base_symbol.length),
      ),
      options: {
        isWholeLine: true,
        className,
        glyphMarginClassName: glyphClass,
        overviewRuler: { color: qualityColor(quality), position: 4 },
        hoverMessage: { value: hoverLines.join('\n') },
      } as MonacoEditor.IModelDecorationOptions,
    })
  }

  currentDecorations.value = editor.deltaDecorations(currentDecorations.value, decorations)
}

function applyMetricsSummaryDecoration(m: AnalysisMetrics) {
  const editor = editorRef.value
  const monaco = monacoRef.value
  if (!editor || !monaco) return

  const isBad = m.miss_rate > 0.5
  const isWarn = m.miss_rate > 0.2 && !isBad
  const className = isBad ? 'line-decoration-bad' : isWarn ? 'line-decoration-warn' : 'line-decoration-good'
  const glyphClass = isBad ? 'glyph-bad' : isWarn ? 'glyph-warn' : 'glyph-good'

  const hitPct = (m.hit_rate * 100).toFixed(1)
  const missPct = (m.miss_rate * 100).toFixed(1)
  const hoverText = [
    `**Результаты анализа кэша**`,
    '',
    `| Метрика | Значение |`,
    `|:---|:---|`,
    `| Доля попаданий | ${hitPct}% |`,
    `| Доля промахов | ${missPct}% |`,
    `| Попаданий | ${m.cache_hits.toLocaleString()} |`,
    `| Промахов | ${m.cache_misses.toLocaleString()} |`,
    `| Обращений к памяти | ${m.total_memory_accesses.toLocaleString()} |`,
    `| Оценка оптимизации | ${m.optimization_score.toFixed(1)} |`,
  ].join('\n')

  currentDecorations.value = editor.deltaDecorations(currentDecorations.value, [
    {
      range: new monaco.Range(1, 1, 1, 1),
      options: {
        isWholeLine: true,
        className,
        glyphMarginClassName: glyphClass,
        hoverMessage: { value: hoverText },
      } as MonacoEditor.IModelDecorationOptions,
    },
  ])
}

function clearResults() {
  metrics.value = null
  patterns.value = []
  errorMessage.value = null
  reusedFromTaskId.value = null
  currentTaskId.value = null
  currentStatus.value = null
  clearDecorations()
}

function gotoPosition(payload: { line: number; column: number }) {
  const editor = editorRef.value
  const monaco = monacoRef.value
  if (!editor || !monaco) return
  const line = Math.max(1, payload.line)
  const column = Math.max(1, payload.column || 1)
  editor.revealLineInCenter(line)
  editor.setPosition({ lineNumber: line, column })
  editor.focus()
}

function clearDecorations() {
  const editor = editorRef.value
  if (!editor) return
  currentDecorations.value = editor.deltaDecorations(currentDecorations.value, [])
}

function openFile() {
  fileInputRef.value?.click()
}

function handleFileOpen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  currentFileId.value = null
  loadedContent.value = null
  const reader = new FileReader()
  reader.onload = (e) => {
    code.value = (e.target?.result as string) || ''
    clearResults()
    toast(`Файл ${file.name} открыт`, 'info')
  }
  reader.readAsText(file)
  input.value = ''
}

function formatBytes(n: number) {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  try {
    await projectStore.fetchProjects()
    syncSandboxProjectFromList()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    toast(err.response?.data?.error || 'Не удалось загрузить проекты', 'error')
  }
})
</script>

<template>
  <div class="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
    <CacheConfigGateModal :open="showConfigGateModal" @close="showConfigGateModal = false" />
    <AppHeader />

    <input
      ref="fileInputRef"
      type="file"
      accept=".c,.h,.cpp,.cxx"
      class="hidden"
      @change="handleFileOpen"
    />

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
      <label class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 shrink-0">
        Проект
        <select
          v-model="selectedProjectId"
          class="max-w-[200px] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs px-2 py-1.5 text-zinc-900 dark:text-zinc-100"
          :disabled="projectStore.projects.length === 0"
        >
          <option v-if="projectStore.projects.length === 0" value="">Нет проектов</option>
          <option v-for="p in projectStore.projects" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </label>

      <div class="w-px h-5 bg-zinc-300 dark:bg-zinc-700 hidden sm:block" />

      <AppButton size="sm" :loading="analyzing" @click="runAnalysis">
        <Play :size="14" class="mr-1.5" />
        {{ isFileUnchanged ? 'Анализировать ещё раз' : 'Анализировать' }}
      </AppButton>

      <div class="w-px h-5 bg-zinc-300 dark:bg-zinc-700" />

      <AppButton variant="ghost" size="sm" @click="newEmptyFile">
        <FilePlus :size="14" class="mr-1.5" />
        Новый
      </AppButton>

      <AppButton variant="ghost" size="sm" @click="openFile">
        <FolderOpen :size="14" class="mr-1.5" />
        Загрузить с диска
      </AppButton>

      <AppButton
        variant="ghost"
        size="sm"
        :disabled="!metrics && !currentStatus && patterns.length === 0"
        @click="clearResults"
      >
        <Trash2 :size="14" class="mr-1.5" />
        Очистить
      </AppButton>

      <div class="ml-auto flex items-center gap-3 text-xs">
        <span class="text-zinc-500 dark:text-zinc-400 font-mono">{{ fileName }}</span>
        <span v-if="currentStatus && isRunning" class="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
          <Loader2 :size="12" class="animate-spin" />
          {{ STATUS_LABELS[currentStatus] }}
        </span>
        <span v-else-if="currentStatus === 'done'" class="flex items-center gap-1.5 text-green-400">
          <CheckCircle :size="12" />
          Готово
        </span>
        <span v-else-if="currentStatus === 'error'" class="flex items-center gap-1.5 text-red-400">
          <XCircle :size="12" />
          Ошибка
        </span>
      </div>
    </div>

    <div class="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/40">
      <CacheSimulatorConfigToolbar v-model="selectedCacheConfigId" />
    </div>

    <!-- Main content: 3 panes — files | editor | results -->
    <Splitpanes class="flex-1 overflow-hidden">
      <Pane :size="18" :min-size="12" :max-size="35">
        <div class="h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
          <div class="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Файлы проекта
            </h3>
            <button
              type="button"
              class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              :disabled="filesLoading"
              :title="'Обновить'"
              @click="refreshFiles"
            >
              <RefreshCw :size="14" :class="filesLoading ? 'animate-spin' : ''" />
            </button>
          </div>

          <div v-if="!projectStore.projects.length" class="p-4 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
            У вас пока нет проектов. Создайте проект на
            <RouterLink to="/dashboard" class="text-indigo-600 dark:text-indigo-400 underline">дашборде</RouterLink>
            и вернитесь в песочницу — список файлов подтянется из выбранного проекта.
          </div>

          <div
            v-else-if="projectFiles.length === 0 && !filesLoading"
            class="p-4 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed"
          >
            В этом проекте ещё нет загруженных файлов analysis-api. Запустите
            <kbd class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
              Анализировать</kbd>
            — исходник сохранится в выбранный проект и появится в списке.
          </div>

          <ul v-else class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            <li
              v-for="f in projectFiles"
              :key="f.id"
              class="flex items-stretch gap-0.5 rounded-lg group/row transition-colors"
              :class="
                currentFileId === f.id ? 'bg-indigo-50/80 dark:bg-indigo-950/30' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              "
            >
              <button
                type="button"
                class="flex-1 min-w-0 text-left px-2.5 py-2 rounded-l-lg cursor-pointer flex items-start gap-2 transition-colors text-zinc-700 dark:text-zinc-300"
                :class="currentFileId === f.id ? 'text-indigo-700 dark:text-indigo-300' : ''"
                @click="loadFileFromList(f)"
              >
                <FileCode
                  :size="14"
                  class="mt-0.5 shrink-0"
                  :class="
                    currentFileId === f.id ? 'text-indigo-500' : 'text-zinc-400 group-hover/row:text-zinc-600 dark:group-hover/row:text-zinc-300'
                  "
                />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium truncate" :title="f.filename">{{ f.filename }}</p>
                  <p class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 tabular-nums">
                    {{ formatBytes(f.size_bytes) }} · {{ formatDate(f.created_at) }}
                  </p>
                </div>
              </button>
              <button
                type="button"
                title="Убрать из списка проекта"
                class="shrink-0 px-2 py-2 rounded-r-lg cursor-pointer flex items-start text-zinc-400 hover:text-red-600 dark:hover:text-red-400 opacity-70 group-hover/row:opacity-100 transition-opacity"
                @click.stop="removeFileFromList(f)"
              >
                <Trash2 :size="14" class="mt-0.5" />
              </button>
            </li>
          </ul>
        </div>
      </Pane>

      <Pane :size="50" :min-size="30">
        <VueMonacoEditor
          v-model:value="code"
          language="c"
          :theme="monacoTheme"
          :options="{
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
            minimap: { enabled: true },
            glyphMargin: true,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8 },
          }"
          @mount="handleEditorMount"
        />
      </Pane>

      <Pane :size="32" :min-size="22">
        <div class="h-full overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900">

          <!-- Pipeline progress -->
          <div v-if="currentStatus && isRunning" class="rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-5">
            <h3 class="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Прогресс</h3>
            <div class="flex items-center gap-1">
              <template v-for="(step, i) in statusSteps" :key="i">
                <div class="flex items-center gap-1.5">
                  <div
                    class="w-2.5 h-2.5 rounded-full transition-colors"
                    :class="{
                      'bg-green-500': step.done,
                      'bg-indigo-500 animate-pulse': step.active,
                      'bg-zinc-300 dark:bg-zinc-600': !step.done && !step.active,
                    }"
                  />
                  <span
                    class="text-xs whitespace-nowrap"
                    :class="{
                      'text-green-600 dark:text-green-400 font-medium': step.done,
                      'text-indigo-600 dark:text-indigo-400 font-medium': step.active,
                      'text-zinc-500': !step.done && !step.active,
                    }"
                  >
                    {{ step.label }}
                  </span>
                </div>
                <div
                  v-if="i < statusSteps.length - 1"
                  class="flex-1 h-px mx-1"
                  :class="step.done ? 'bg-green-300 dark:bg-green-500/40' : 'bg-zinc-200 dark:bg-zinc-700'"
                />
              </template>
            </div>
          </div>

          <!-- Standalone error banner if cache stage failed and нет паттернов -->
          <div
            v-if="currentStatus === 'error' && errorMessage && patterns.length === 0 && !metrics"
            class="rounded-xl border border-red-300/60 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4"
          >
            <div class="flex items-start gap-2.5">
              <AlertTriangle :size="18" class="mt-0.5 text-red-500 shrink-0" />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
                  Анализ завершился с ошибкой
                </p>
                <p class="text-xs text-red-600 dark:text-red-200 whitespace-pre-wrap leading-relaxed">
                  {{ errorMessage }}
                </p>
              </div>
            </div>
          </div>

          <!-- Extended results -->
          <ExtendedResultsPanel
            v-if="(metrics || patterns.length > 0 || errorMessage) && currentTaskId"
            :task-id="currentTaskId"
            :status="currentStatus ?? undefined"
            :metrics="metrics"
            :patterns="patterns"
            :error-message="errorMessage"
            :reused-from-task-id="reusedFromTaskId"
            :loading="false"
            @goto="gotoPosition"
          />

          <!-- Empty state -->
          <div
            v-if="!metrics && patterns.length === 0 && !isRunning && !errorMessage"
            class="flex flex-col items-center justify-center h-full text-center"
          >
            <div class="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <FileCode :size="32" class="text-zinc-400 dark:text-zinc-600" />
            </div>
            <h3 class="text-lg font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Готов к анализу</h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-600 max-w-xs mb-4">
              Выберите файл слева или напишите C-код в редакторе и нажмите
              <kbd class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono">Анализировать</kbd>
            </p>
            <div class="flex gap-2">
              <AppButton size="sm" variant="secondary" @click="openFile">
                <FolderOpen :size="14" class="mr-1.5" />
                Загрузить с диска
              </AppButton>
            </div>
          </div>

        </div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<style>
.line-decoration-bad {
  background: rgba(239, 68, 68, 0.12) !important;
}
.line-decoration-warn {
  background: rgba(245, 158, 11, 0.10) !important;
}
.line-decoration-good {
  background: rgba(34, 197, 94, 0.06) !important;
}

.glyph-bad {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='5' fill='%23ef4444'/%3E%3C/svg%3E") center center no-repeat;
  background-size: 10px;
}
.glyph-warn {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='5' fill='%23f59e0b'/%3E%3C/svg%3E") center center no-repeat;
  background-size: 10px;
}
.glyph-good {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='5' fill='%2322c55e'/%3E%3C/svg%3E") center center no-repeat;
  background-size: 10px;
}

.splitpanes__splitter {
  background: #e4e4e7 !important;
  width: 4px !important;
}
.dark .splitpanes__splitter {
  background: #27272a !important;
}
.splitpanes__splitter:hover {
  background: #6366f1 !important;
}
</style>

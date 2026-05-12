// patternClassification — единая «эвристика качества» для UI: фронт + админка.
// Воркер отдаёт сырые `pattern_type`, мы не пытаемся менять его расчёт, а
// помечаем строки одним из трёх уровней (good/warn/bad), плюс держим единое
// человеческое имя и подсказку. То же самое использует ExtendedResultsPanel,
// AdminDashboardPage и Sandbox-декорации, чтобы пользователь не путался в
// разных классификациях между экранами.

export type PatternQuality = 'good' | 'warn' | 'bad' | 'neutral'

const GOOD_PATTERNS = new Set(['unit_stride', 'constant', 'constant_stride'])
const BAD_PATTERNS = new Set(['gather_scatter', 'indirect', 'random'])
const WARN_PATTERNS = new Set(['non_unit_stride', 'broadcast', 'strided'])

const HUMAN_LABELS: Record<string, string> = {
  unit_stride: 'Линейный (unit stride)',
  constant: 'Константный индекс',
  constant_stride: 'Постоянный шаг',
  non_unit_stride: 'Шаг > 1',
  broadcast: 'Broadcast',
  strided: 'С шагом',
  gather_scatter: 'Gather / scatter',
  indirect: 'Косвенный (a[idx[i]])',
  random: 'Случайный',
}

const SUGGESTIONS: Record<string, string> = {
  unit_stride: 'Оптимальная утилизация кэш-линии.',
  constant: 'Чтение из одной кэш-линии — высокий повтор использования.',
  constant_stride: 'Постоянный шаг — стабильное префетчинг-поведение.',
  non_unit_stride:
    'Часть кэш-линии теряется. Подумайте про AoS→SoA или объединение полей.',
  broadcast: 'Повторное чтение одного и того же элемента — типично для редукции.',
  strided: 'Шаг > 1 — кэш-линия используется частично.',
  gather_scatter:
    'Косвенный доступ a[idx[i]] — высокая фрагментация кэша. Попробуйте сортировку индексов или blocking.',
  indirect: 'Косвенный доступ — непредсказуемый префетч.',
  random: 'Случайный паттерн — высокий процент промахов почти неизбежен.',
}

export function patternQuality(patternType: string): PatternQuality {
  const key = (patternType || '').toLowerCase()
  if (GOOD_PATTERNS.has(key)) return 'good'
  if (BAD_PATTERNS.has(key)) return 'bad'
  if (WARN_PATTERNS.has(key)) return 'warn'
  return 'neutral'
}

export function patternLabel(patternType: string): string {
  return HUMAN_LABELS[(patternType || '').toLowerCase()] || patternType || 'unknown'
}

export function patternSuggestion(patternType: string, dependence?: string): string {
  const base = SUGGESTIONS[(patternType || '').toLowerCase()]
  const dep = dependence?.trim() ? ` Зависимость: ${dependence}.` : ''
  return (base || 'Паттерн не классифицирован.') + dep
}

// CSS-классы Tailwind: badge для таблицы паттернов.
export function qualityBadgeClass(q: PatternQuality): string {
  switch (q) {
    case 'good':
      return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
    case 'warn':
      return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
    case 'bad':
      return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
    default:
      return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
  }
}

// Цвет (rgb) для Chart.js и Monaco-glyph-ов.
export function qualityColor(q: PatternQuality): string {
  switch (q) {
    case 'good':
      return '#22c55e'
    case 'warn':
      return '#f59e0b'
    case 'bad':
      return '#ef4444'
    default:
      return '#71717a'
  }
}

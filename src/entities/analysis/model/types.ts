export interface AnalysisTask {
  id: string
  file_id: string
  status: TaskStatus
  type: string
  error_message?: string
  reused_from_task_id?: string
  static_artifact_s3_path?: string
  cache_artifact_s3_path?: string
  cache_profile_hash?: string
  cache_config_id?: string
  cache_config_s3_path?: string
  created_at: string
  updated_at: string
}

/** Конфиг для cache-analysis-worker — пользователь загружает файл, MinIO-хранится на бэкенде. */
export interface CacheSimulatorConfig {
  id: string
  user_id: string
  display_name: string
  original_filename: string
  s3_path: string
  size_bytes: number
  created_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  filename: string
  s3_path: string
  content_hash: string
  size_bytes: number
  owner_user_id?: string
  created_at: string
}

export type TaskStatus =
  | 'pending'
  | 'static_running'
  | 'static_done'
  | 'cache_running'
  | 'done'
  | 'error'

export interface AnalysisMetrics {
  task_id: string
  status: string
  total_memory_accesses: number
  cache_hits: number
  cache_misses: number
  hit_rate: number
  miss_rate: number
  optimization_score: number
}

// AggregatedPattern зеркалит analysis-api `AggregatedEntry`: одна строка
// статического паттерна с прикленной к ней динамической агрегацией по уровню
// кэша (поэтому один и тот же `pattern_fingerprint`/`base_symbol` может
// встречаться дважды — для L1 и для L2). На вход в UI приходит массивом
// от GET /analysis/tasks/:task_id/aggregated и от
// GET /analysis/files/:file_id/simulation-results.
export interface AggregatedPattern {
  sequence_index: number
  source_file: string
  source_line: number
  source_column: number
  base_symbol: string
  base_kind: string
  function: string
  pattern_type: string
  pattern_fingerprint: string
  pattern_signature: string
  access_kind: string
  affine: number
  stride?: number | null
  depth: number
  fill_factor: number
  has_indexed_addressing: number
  indexed_by_memory: number
  conditional: number
  alignment?: number | null
  working_set_bytes: number
  dependence: string
  contiguous_block?: number | null
  load_count: number
  store_count: number
  cache_profile_hash: string
  cache_level: string
  source_task_id?: string
  misses_total: number
  misses_read: number
  misses_write: number
}

export interface FileSimulationResults {
  file_id: string
  filename: string
  task_id: string
  status: TaskStatus
  error_message?: string
  reused_from_task_id?: string
  metrics: AnalysisMetrics
  patterns: AggregatedPattern[]
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'В очереди',
  static_running: 'Статический анализ...',
  static_done: 'Статика завершена',
  cache_running: 'Кэш-симуляция...',
  done: 'Завершено',
  error: 'Ошибка',
}

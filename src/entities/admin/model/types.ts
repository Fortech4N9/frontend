export interface AdminUser {
  id: string
  email: string
  role: 'user' | 'admin'
  analysis_quota: number
  is_active: boolean
  created_at: string
}

export interface AdminProject {
  id: string
  name: string
  user_id: string
  user_email: string
  user_role: 'user' | 'admin'
  created_at: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
}

export interface CoreAdminStats {
  total_users: number
  total_projects: number
}

export interface AnalysisAdminStats {
  total_files: number
  done: number
  pending: number
  error: number
}

export interface TopPattern {
  pattern_type: string
  count: number
}

export interface SystemStatus {
  postgres: { status: string; error?: string }
  minio: { status: string; error?: string }
  kafka: { status: string; error?: string }
  clickhouse: { status: string; error?: string }
  start_static_queue: number
}

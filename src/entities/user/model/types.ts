export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  analysis_quota: number
  is_active: boolean
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
}

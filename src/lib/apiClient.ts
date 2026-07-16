import type { AuthUser } from './types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'sculpt_auth_token'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  const token = getStoredToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (requireAuth) {
    throw new ApiError('Unauthorized', 401)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(data.error || `Request failed (${response.status})`, response.status)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, requireAuth = false) =>
    request<T>(path, { method: 'GET' }, requireAuth),

  post: <T>(path: string, body?: unknown, requireAuth = false) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }, requireAuth),

  patch: <T>(path: string, body: unknown, requireAuth = true) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, requireAuth),

  delete: <T>(path: string, requireAuth = true) =>
    request<T>(path, { method: 'DELETE' }, requireAuth),

  // Auth
  async signUp(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const result = await this.post<{ token: string; user: AuthUser }>('/auth/signup', { email, password })
    setStoredToken(result.token)
    return result
  },

  async signIn(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const result = await this.post<{ token: string; user: AuthUser }>('/auth/signin', { email, password })
    setStoredToken(result.token)
    return result
  },

  async signInWithMagicLink(email: string): Promise<void> {
    await this.post('/auth/magic-link', { email })
  },

  async verifyMagicLink(token: string): Promise<{ token: string; user: AuthUser }> {
    const result = await this.get<{ token: string; user: AuthUser }>(`/auth/verify-magic-link?token=${encodeURIComponent(token)}`)
    setStoredToken(result.token)
    return result
  },

  async getMe(): Promise<{ user: AuthUser }> {
    return this.get('/auth/me', true)
  },

  signOut() {
    setStoredToken(null)
  },
}

/**
 * Shared Turso client for CLI scripts
 */
import { createClient } from '@libsql/client'

export function getScriptDb() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    console.error('Error: TURSO_DATABASE_URL is required')
    process.exit(1)
  }

  return createClient({ url, authToken: authToken || undefined })
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'object') return value as T
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

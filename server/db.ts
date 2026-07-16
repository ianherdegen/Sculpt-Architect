import { createClient, type Client } from '@libsql/client'

let client: Client | null = null

export function getDb(): Client {
  if (client) return client

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is required')
  }

  client = createClient({
    url,
    authToken: authToken || undefined,
  })

  return client
}

export function rowToBool(value: unknown): boolean {
  return value === 1 || value === true
}

export function boolToInt(value: boolean): number {
  return value ? 1 : 0
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

export function formatUserProfile(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    bio: row.bio as string,
    email: row.email as string,
    events: parseJson(row.events, []),
    share_id: (row.share_id as string) || null,
    permissions: parseJson<Record<string, boolean>>(row.permissions, {}),
    venmo_username: (row.venmo_username as string) || null,
    profile_photo_url: (row.profile_photo_url as string) || null,
    spotify_playlist_urls: parseJson<string[]>(row.spotify_playlist_urls, []),
    is_banned: rowToBool(row.is_banned),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function formatPoseVariation(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    pose_id: row.pose_id as string,
    name: row.name as string,
    is_default: rowToBool(row.is_default),
    author_id: (row.author_id as string) || null,
    cue_1: (row.cue_1 as string) || null,
    cue_2: (row.cue_2 as string) || null,
    cue_3: (row.cue_3 as string) || null,
    breath_transition: (row.breath_transition as string) || null,
    image_url: (row.image_url as string) || null,
    transitional_cues: parseJson(row.transitional_cues, []),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function formatSequence(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    sections: parseJson(row.sections, []),
    share_id: (row.share_id as string) || null,
    display_order: Number(row.display_order ?? 0),
    published_to_profile: rowToBool(row.published_to_profile),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT permissions FROM user_profiles WHERE user_id = ?',
    args: [userId],
  })
  if (result.rows.length === 0) return false
  const permissions = parseJson<Record<string, boolean>>(result.rows[0].permissions, {})
  return permissions[permissionKey] === true
}

export async function isAdmin(userId: string): Promise<boolean> {
  return hasPermission(userId, 'admin')
}

export async function touchUpdatedAt(table: string, id: string) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE ${table} SET updated_at = datetime('now') WHERE id = ?`,
    args: [id],
  })
}

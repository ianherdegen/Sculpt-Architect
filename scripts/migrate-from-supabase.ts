/**
 * Migrate data from Supabase to Turso
 *
 * Usage:
 *   yarn migrate-from-supabase
 *
 * Environment variables:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for full export)
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client'
import { hashPassword } from '../server/auth'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials (VITE_SUPABASE_URL + anon/service key)')
  process.exit(1)
}

if (!tursoUrl) {
  console.error('Missing TURSO_DATABASE_URL')
  process.exit(1)
}

const db = createClient({ url: tursoUrl, authToken: tursoToken || undefined })

async function supabaseFetch<T>(table: string, select = '*'): Promise<T[]> {
  const url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`
  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey!,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase ${table} fetch failed (${response.status}): ${text}`)
  }

  return response.json() as Promise<T[]>
}

async function ensureSchema() {
  const schema = await import('fs/promises').then((fs) =>
    fs.readFile(new URL('../sql/turso-schema.sql', import.meta.url), 'utf-8')
  )
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (const sql of statements) {
    try {
      await db.execute(sql)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('already exists')) {
        // ignore duplicate index/table errors from IF NOT EXISTS edge cases
        if (!msg.includes('UNIQUE constraint failed')) throw err
      }
    }
  }
}

interface SupabaseProfile {
  id: string
  user_id: string
  name: string
  bio: string
  email: string
  events: unknown
  share_id: string | null
  permissions: unknown
  venmo_username?: string | null
  profile_photo_url?: string | null
  spotify_playlist_urls?: unknown
  is_banned?: boolean
  created_at: string
  updated_at: string
}

async function migrate() {
  console.log('🔍 Fetching data from Supabase...\n')

  const [poses, variations, sequences, profiles] = await Promise.all([
    supabaseFetch<Record<string, unknown>>('poses'),
    supabaseFetch<Record<string, unknown>>('pose_variations'),
    supabaseFetch<Record<string, unknown>>('sequences'),
    supabaseFetch<SupabaseProfile>('user_profiles'),
  ])

  console.log(`  Poses: ${poses.length}`)
  console.log(`  Variations: ${variations.length}`)
  console.log(`  Sequences: ${sequences.length}`)
  console.log(`  Profiles: ${profiles.length}\n`)

  console.log('📦 Ensuring Turso schema...')
  await ensureSchema()

  console.log('👤 Migrating users and profiles...')
  const placeholderHash = await hashPassword('RESET_PASSWORD_REQUIRED')
  const userIds = new Set<string>()

  for (const profile of profiles) {
    userIds.add(profile.user_id)
  }
  for (const seq of sequences) {
    userIds.add(seq.user_id as string)
  }
  for (const pose of poses) {
    if (pose.author_id) userIds.add(pose.author_id as string)
  }
  for (const v of variations) {
    if (v.author_id) userIds.add(v.author_id as string)
  }

  const emailByUserId = new Map(profiles.map((p) => [p.user_id, p.email]))

  for (const userId of userIds) {
    const email = emailByUserId.get(userId) || `migrated-${userId.slice(0, 8)}@placeholder.local`
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      args: [userId, email.toLowerCase(), placeholderHash],
    })
  }

  for (const profile of profiles) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO user_profiles
            (id, user_id, name, bio, email, events, share_id, permissions,
             venmo_username, profile_photo_url, spotify_playlist_urls, is_banned, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        profile.id,
        profile.user_id,
        profile.name || '',
        profile.bio || '',
        profile.email,
        JSON.stringify(profile.events || []),
        profile.share_id || null,
        JSON.stringify(profile.permissions || {}),
        profile.venmo_username || null,
        profile.profile_photo_url || null,
        JSON.stringify(profile.spotify_playlist_urls || []),
        profile.is_banned ? 1 : 0,
        profile.created_at,
        profile.updated_at,
      ],
    })
  }

  console.log(`  ✅ ${userIds.size} users, ${profiles.length} profiles`)

  console.log('🧘 Migrating poses...')
  for (const pose of poses) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO poses (id, name, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      args: [pose.id, pose.name, pose.author_id || null, pose.created_at, pose.updated_at],
    })
  }
  console.log(`  ✅ ${poses.length} poses`)

  console.log('🔄 Migrating pose variations...')
  for (const v of variations) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO pose_variations
            (id, pose_id, name, is_default, author_id, cue_1, cue_2, cue_3,
             breath_transition, image_url, transitional_cues, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        v.id,
        v.pose_id,
        v.name,
        v.is_default ? 1 : 0,
        v.author_id || null,
        v.cue_1 || null,
        v.cue_2 || null,
        v.cue_3 || null,
        v.breath_transition || null,
        v.image_url || null,
        JSON.stringify(v.transitional_cues || []),
        v.created_at,
        v.updated_at,
      ],
    })
  }
  console.log(`  ✅ ${variations.length} variations`)

  console.log('📋 Migrating sequences...')
  for (const seq of sequences) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO sequences
            (id, user_id, name, sections, share_id, display_order, published_to_profile, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        seq.id,
        seq.user_id,
        seq.name,
        JSON.stringify(seq.sections || []),
        seq.share_id || null,
        Number(seq.display_order ?? 0),
        seq.published_to_profile ? 1 : 0,
        seq.created_at,
        seq.updated_at,
      ],
    })
  }
  console.log(`  ✅ ${sequences.length} sequences`)

  console.log('\n✨ Migration complete!')
  console.log('\n⚠️  Migrated users have placeholder passwords.')
  console.log('   They must use "Forgot password" or sign up again with the same email.')
  console.log('   (Password reset flow can be added — for now use magic link or re-register.)')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

/**
 * Import data from Supabase PostgreSQL cluster backup (.backup.gz) into Turso
 *
 * Usage:
 *   yarn import-pg-backup /path/to/backup.gz
 */

import { createClient } from '@libsql/client'
import { createReadStream } from 'fs'
import { createGunzip } from 'zlib'
import { createInterface } from 'readline'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const backupPath = process.argv[2] || process.env.PG_BACKUP_PATH
const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

if (!backupPath) {
  console.error('Usage: yarn import-pg-backup <path-to-backup.gz>')
  process.exit(1)
}

if (!tursoUrl) {
  console.error('Missing TURSO_DATABASE_URL')
  process.exit(1)
}

const db = createClient({ url: tursoUrl, authToken: tursoToken || undefined })

function parseCopyValue(value: string): string | null {
  if (value === '\\N') return null
  return value
}

function parseBool(value: string | null): number {
  if (value === 't' || value === 'true') return 1
  return 0
}

async function ensureSchema() {
  const schemaPath = resolve(__dirname, '../sql/turso-schema.sql')
  const schema = readFileSync(schemaPath, 'utf-8')
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (const sql of statements) {
    try {
      await db.execute(sql)
    } catch {
      // ignore existing objects
    }
  }
}

type CopyHandler = (columns: string[]) => Promise<void>

const COPY_HANDLERS: Record<string, CopyHandler> = {}

let usersCount = 0
let profilesCount = 0
let posesCount = 0
let variationsCount = 0
let sequencesCount = 0

COPY_HANDLERS['auth.users'] = async (cols) => {
  const id = cols[1]
  const email = cols[4]
  const encryptedPassword = cols[5]
  if (!id || !email || !encryptedPassword || encryptedPassword === '\\N') return

  await db.execute({
    sql: `INSERT OR REPLACE INTO users (id, email, password_hash, created_at, updated_at)
          VALUES (?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
    args: [id, email.toLowerCase(), encryptedPassword, cols[19] || null, cols[20] || null],
  })
  usersCount++
}

COPY_HANDLERS['public.user_profiles'] = async (cols) => {
  await db.execute({
    sql: `INSERT OR REPLACE INTO user_profiles
          (id, user_id, name, bio, email, events, share_id, permissions, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      cols[0],
      cols[1],
      cols[2] || '',
      cols[3] || '',
      cols[4],
      cols[5] || '[]',
      parseCopyValue(cols[6]),
      cols[9] || '{}',
      cols[7],
      cols[8],
    ],
  })
  profilesCount++
}

COPY_HANDLERS['public.poses'] = async (cols) => {
  await db.execute({
    sql: `INSERT OR REPLACE INTO poses (id, name, created_at, updated_at, author_id) VALUES (?, ?, ?, ?, ?)`,
    args: [cols[0], cols[1], cols[2], cols[3], parseCopyValue(cols[4])],
  })
  posesCount++
}

COPY_HANDLERS['public.pose_variations'] = async (cols) => {
  await db.execute({
    sql: `INSERT OR REPLACE INTO pose_variations
          (id, pose_id, name, is_default, created_at, updated_at, image_url, cue_1, cue_2, cue_3, breath_transition, author_id, transitional_cues)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`,
    args: [
      cols[0],
      cols[1],
      cols[2],
      parseBool(cols[3]),
      cols[4],
      cols[5],
      parseCopyValue(cols[6]),
      parseCopyValue(cols[7]),
      parseCopyValue(cols[8]),
      parseCopyValue(cols[9]),
      parseCopyValue(cols[10]),
      parseCopyValue(cols[11]),
    ],
  })
  variationsCount++
}

COPY_HANDLERS['public.sequences'] = async (cols) => {
  await db.execute({
    sql: `INSERT OR REPLACE INTO sequences
          (id, user_id, name, sections, created_at, updated_at, display_order, published_to_profile)
          VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
    args: [cols[0], cols[1], cols[2], cols[3] || '[]', cols[4], cols[5]],
  })
  sequencesCount++
}

function parseCopyHeader(line: string): { table: string; columns: string[] } | null {
  const match = line.match(/^COPY ([\w.]+) \((.+)\) FROM stdin;$/)
  if (!match) return null
  return {
    table: match[1],
    columns: match[2].split(', ').map((c) => c.trim()),
  }
}

async function importBackup() {
  console.log(`📂 Reading backup: ${backupPath}\n`)

  await ensureSchema()
  await db.execute('PRAGMA foreign_keys = OFF')
  console.log('✅ Schema ready\n')

  const stream = createReadStream(backupPath).pipe(createGunzip())
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  let currentTable: string | null = null
  let lineNum = 0

  for await (const line of rl) {
    lineNum++

    if (line.startsWith('COPY ')) {
      const header = parseCopyHeader(line)
      if (header && COPY_HANDLERS[header.table]) {
        currentTable = header.table
        if (lineNum % 1000 === 0) process.stdout.write('.')
      } else {
        currentTable = null
      }
      continue
    }

    if (line === '\\.') {
      currentTable = null
      continue
    }

    if (!currentTable) continue

    const handler = COPY_HANDLERS[currentTable]
    if (!handler) continue

    const cols = line.split('\t')
    try {
      await handler(cols)
    } catch (err) {
      console.error(`\nError importing ${currentTable} at line ${lineNum}:`, err)
      console.error('Row:', line.slice(0, 200))
      throw err
    }
  }

  console.log('\n\n✨ Import complete!')
  await db.execute('PRAGMA foreign_keys = ON')
  console.log(`   Users: ${usersCount}`)
  console.log(`   Profiles: ${profilesCount}`)
  console.log(`   Poses: ${posesCount}`)
  console.log(`   Variations: ${variationsCount}`)
  console.log(`   Sequences: ${sequencesCount}`)
  console.log('\n   Passwords preserved from Supabase (bcrypt compatible).')
}

importBackup().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})

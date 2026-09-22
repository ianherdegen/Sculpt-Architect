/**
 * Import Supabase storage zip and update image URLs in Turso.
 * Also copies files into public/media so production (Vercel) can serve them statically.
 *
 * Usage:
 *   yarn import-storage /path/to/storage.zip
 */

import { createClient } from '@libsql/client'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, statSync, cpSync, rmSync } from 'fs'
import { join, basename } from 'path'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const zipPath = process.argv[2]
const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN
const rootDir = resolve(__dirname, '..')
const uploadsDir = join(rootDir, 'uploads')
const publicMediaDir = join(rootDir, 'public', 'media')

if (!zipPath) {
  console.error('Usage: yarn import-storage <path-to-storage.zip>')
  process.exit(1)
}

if (!tursoUrl) {
  console.error('Missing TURSO_DATABASE_URL')
  process.exit(1)
}

const db = createClient({ url: tursoUrl, authToken: tursoToken || undefined })

/** Public static URL — works on Vercel without Blob/local disk */
function toPublicUrl(relativePath: string): string {
  return `/media/${relativePath}`
}

function extractZip() {
  const tmpDir = join(uploadsDir, '.extract-tmp')
  execSync(`rm -rf "${tmpDir}" && mkdir -p "${tmpDir}"`)
  execSync(`unzip -q "${zipPath}" -d "${tmpDir}"`)

  const prefix = readdirSync(tmpDir).find((d) =>
    existsSync(join(tmpDir, d, 'pose-images'))
  )
  if (!prefix) throw new Error('Could not find pose-images in zip')

  const src = join(tmpDir, prefix)
  mkdirSync(uploadsDir, { recursive: true })

  for (const bucket of ['pose-images', 'profile-photos']) {
    const from = join(src, bucket)
    const to = join(uploadsDir, bucket)
    if (existsSync(from)) {
      rmSync(to, { recursive: true, force: true })
      cpSync(from, to, { recursive: true })
    }
  }

  rmSync(tmpDir, { recursive: true, force: true })
}

function syncToPublicMedia() {
  rmSync(publicMediaDir, { recursive: true, force: true })
  mkdirSync(publicMediaDir, { recursive: true })
  for (const bucket of ['pose-images', 'profile-photos']) {
    const from = join(uploadsDir, bucket)
    if (existsSync(from)) {
      cpSync(from, join(publicMediaDir, bucket), { recursive: true })
    }
  }
}

function listFiles(dir: string, base = ''): string[] {
  if (!existsSync(dir)) return []
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = base ? `${base}/${entry}` : entry
    if (statSync(full).isDirectory()) {
      results.push(...listFiles(full, rel))
    } else {
      results.push(rel)
    }
  }
  return results
}

async function updatePoseVariationUrls() {
  const poseFiles = listFiles(join(uploadsDir, 'pose-images'), 'pose-images')
  const fileByName = new Map(poseFiles.map((f) => [basename(f), f]))

  // Also index by variation UUID prefix in filename: {uuid}-{timestamp}.ext
  const filesByVarId = new Map<string, string[]>()
  for (const f of poseFiles) {
    const name = basename(f)
    const m = name.match(/^([0-9a-f-]{36})-/i)
    if (!m) continue
    const id = m[1]
    if (!filesByVarId.has(id)) filesByVarId.set(id, [])
    filesByVarId.get(id)!.push(f)
  }

  const result = await db.execute('SELECT id, image_url FROM pose_variations')

  let updated = 0
  let linkedEmpty = 0
  let skipped = 0

  for (const row of result.rows) {
    const id = String(row.id)
    const oldUrl = row.image_url as string | null

    let filePath: string | undefined

    if (oldUrl) {
      const filename = basename(oldUrl.split('?')[0])
      filePath = fileByName.get(filename)
    }

    // Fallback: match by variation id in filename (pick newest timestamp)
    if (!filePath) {
      const candidates = filesByVarId.get(id)
      if (candidates?.length) {
        candidates.sort()
        filePath = candidates[candidates.length - 1]
        if (!oldUrl) linkedEmpty++
      }
    }

    if (!filePath) {
      skipped++
      continue
    }

    const newUrl = toPublicUrl(filePath)
    if (oldUrl === newUrl) continue

    await db.execute({
      sql: `UPDATE pose_variations SET image_url = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [newUrl, id],
    })
    updated++
  }

  return { updated, linkedEmpty, skipped, total: result.rows.length, files: poseFiles.length }
}

async function updateProfilePhotoUrls() {
  const profileDir = join(uploadsDir, 'profile-photos')
  if (!existsSync(profileDir)) return { updated: 0 }

  let updated = 0
  for (const userId of readdirSync(profileDir)) {
    const userDir = join(profileDir, userId)
    if (!statSync(userDir).isDirectory()) continue

    const photos = readdirSync(userDir).filter((f) => !f.startsWith('.'))
    if (photos.length === 0) continue

    const latest = photos.sort((a, b) => {
      const tsA = parseInt(a.match(/photo-(\d+)/)?.[1] || '0', 10)
      const tsB = parseInt(b.match(/photo-(\d+)/)?.[1] || '0', 10)
      return tsB - tsA
    })[0]

    const newUrl = toPublicUrl(`profile-photos/${userId}/${latest}`)
    await db.execute({
      sql: `UPDATE user_profiles SET profile_photo_url = ?, updated_at = datetime('now') WHERE user_id = ?`,
      args: [newUrl, userId],
    })
    updated++
  }

  return { updated }
}

async function main() {
  console.log(`📦 Extracting storage from: ${zipPath}\n`)
  extractZip()

  const poseFiles = listFiles(join(uploadsDir, 'pose-images'), 'pose-images')
  const profileFiles = listFiles(join(uploadsDir, 'profile-photos'), 'profile-photos')
  console.log(`   Pose images: ${poseFiles.length}`)
  console.log(`   Profile photos: ${profileFiles.length}\n`)

  console.log('📁 Syncing to public/media for production static hosting...')
  syncToPublicMedia()
  console.log('   Done\n')

  console.log('🔗 Updating pose variation URLs...')
  const poseResult = await updatePoseVariationUrls()
  console.log(
    `   Updated: ${poseResult.updated} (newly linked empty: ${poseResult.linkedEmpty}), ` +
      `no file: ${poseResult.skipped}, variations: ${poseResult.total}, files: ${poseResult.files}\n`
  )

  console.log('🔗 Updating profile photo URLs...')
  const profileResult = await updateProfilePhotoUrls()
  console.log(`   Updated: ${profileResult.updated} profile(s)\n`)

  console.log('✨ Storage import complete!')
  console.log('   Local: uploads/ (and public/media/)')
  console.log('   URLs: /media/...')
  console.log('   Redeploy so production picks up public/media.')
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})

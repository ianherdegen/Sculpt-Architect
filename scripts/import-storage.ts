/**
 * Import Supabase storage zip and update image URLs in Turso
 *
 * Usage:
 *   yarn import-storage /path/to/storage.zip
 */

import { createClient } from '@libsql/client'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const zipPath = process.argv[2]
const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN
const uploadsDir = join(resolve(__dirname, '..'), 'uploads')

if (!zipPath) {
  console.error('Usage: yarn import-storage <path-to-storage.zip>')
  process.exit(1)
}

if (!tursoUrl) {
  console.error('Missing TURSO_DATABASE_URL')
  process.exit(1)
}

const db = createClient({ url: tursoUrl, authToken: tursoToken || undefined })

function toApiUrl(relativePath: string): string {
  return `/api/files/${relativePath}`
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
      execSync(`rm -rf "${to}" && cp -R "${from}" "${to}"`)
    }
  }

  execSync(`rm -rf "${tmpDir}"`)
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

  const result = await db.execute('SELECT id, image_url FROM pose_variations WHERE image_url IS NOT NULL')

  let updated = 0
  let skipped = 0

  for (const row of result.rows) {
    const oldUrl = row.image_url as string
    const filename = basename(oldUrl.split('?')[0])
    const filePath = fileByName.get(filename)

    if (!filePath) {
      skipped++
      continue
    }

    const newUrl = toApiUrl(filePath)
    await db.execute({
      sql: `UPDATE pose_variations SET image_url = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [newUrl, row.id],
    })
    updated++
  }

  return { updated, skipped, total: result.rows.length }
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

    // Use the latest photo by timestamp in filename (photo-{timestamp}.ext)
    const latest = photos.sort((a, b) => {
      const tsA = parseInt(a.match(/photo-(\d+)/)?.[1] || '0', 10)
      const tsB = parseInt(b.match(/photo-(\d+)/)?.[1] || '0', 10)
      return tsB - tsA
    })[0]

    const newUrl = toApiUrl(`profile-photos/${userId}/${latest}`)
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

  console.log('🔗 Updating pose variation URLs...')
  const poseResult = await updatePoseVariationUrls()
  console.log(`   Updated: ${poseResult.updated}, skipped (no file): ${poseResult.skipped}, total in DB: ${poseResult.total}\n`)

  console.log('🔗 Updating profile photo URLs...')
  const profileResult = await updateProfilePhotoUrls()
  console.log(`   Updated: ${profileResult.updated} profile(s)\n`)

  console.log('✨ Storage import complete!')
  console.log('   Files are in uploads/ and served at /api/files/*')
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})

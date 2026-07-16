import { put, del } from '@vercel/blob'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join, dirname } from 'path'
import { existsSync } from 'fs'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

export async function uploadFile(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(path, data, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    })
    return blob.url
  }

  const fullPath = join(UPLOADS_DIR, path)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, data)

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'
  return `${baseUrl}/api/files/${path}`
}

export async function deleteFileByUrl(url: string, bucket: string): Promise<void> {
  if (url.includes('blob.vercel-storage.com')) {
    await del(url)
    return
  }

  const marker = `/api/files/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx !== -1) {
    const filePath = join(UPLOADS_DIR, bucket, url.slice(idx + marker.length))
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
    return
  }

  const legacyMarker = `/${bucket}/`
  const legacyIdx = url.lastIndexOf(legacyMarker)
  if (legacyIdx !== -1) {
    const relativePath = url.slice(legacyIdx + 1)
    const filePath = join(UPLOADS_DIR, relativePath)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  }
}

export function extractFilePathFromUrl(url: string, bucket: string): string | null {
  const marker = `/api/files/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx !== -1) {
    return `${bucket}/${url.slice(idx + marker.length).split('?')[0]}`
  }
  const legacyMarker = `/${bucket}/`
  const legacyIdx = url.lastIndexOf(legacyMarker)
  if (legacyIdx !== -1) {
    return url.slice(legacyIdx + 1).split('?')[0]
  }
  return null
}

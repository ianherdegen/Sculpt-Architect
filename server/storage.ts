// @ts-nocheck
import { put, del } from '@vercel/blob'

export async function uploadFile(
  path: string,
  data: ArrayBuffer | Uint8Array,
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

  // Local/dev fallback: only available when running the Node API server
  try {
    const { writeFile, mkdir } = await import('fs/promises')
    const { join, dirname } = await import('path')
    const uploadsDir = join(process.cwd(), 'uploads')
    const fullPath = join(uploadsDir, path)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, data)
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'
    return `${baseUrl}/api/files/${path}`
  } catch {
    throw new Error('File uploads require BLOB_READ_WRITE_TOKEN in production')
  }
}

export async function deleteFileByUrl(url: string, bucket: string): Promise<void> {
  if (url.includes('blob.vercel-storage.com')) {
    await del(url)
    return
  }

  try {
    const { unlink } = await import('fs/promises')
    const { join } = await import('path')
    const { existsSync } = await import('fs')
    const uploadsDir = join(process.cwd(), 'uploads')

    const marker = `/api/files/${bucket}/`
    const idx = url.indexOf(marker)
    if (idx !== -1) {
      const filePath = join(uploadsDir, bucket, url.slice(idx + marker.length))
      if (existsSync(filePath)) await unlink(filePath)
      return
    }
  } catch {
    // ignore on edge / missing fs
  }
}

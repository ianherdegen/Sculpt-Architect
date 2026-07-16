// @ts-nocheck
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  getDb,
  formatUserProfile,
  formatPoseVariation,
  formatSequence,
  parseJson,
  boolToInt,
  hasPermission,
  isAdmin,
} from './db.js'
import {
  createToken,
  generateId,
  generateMagicToken,
  hashPassword,
  verifyPassword,
  type AuthUser,
} from './auth.js'
import { requireAuth } from './middleware.js'
import { findSequencesUsingVariation } from './variationCheck.js'
import { uploadFile, deleteFileByUrl } from './storage.js'

type Env = {
  Variables: {
    user: AuthUser
  }
}

const app = new Hono<Env>()

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// Health check
app.get('/api/health', async (c) => {
  try {
    const db = getDb()
    await db.execute('SELECT 1 as ok')
    return c.json({ status: 'ok', db: true })
  } catch (err: any) {
    return c.json({ status: 'degraded', db: false, error: err?.message || String(err) }, 500)
  }
})

// Serve local uploads in development (Node only)
app.get('/api/files/*', async (c) => {
  try {
    const { readFile } = await import('fs/promises')
    const { join } = await import('path')
    const { existsSync } = await import('fs')
    const path = c.req.path.replace('/api/files/', '')
    const fullPath = join(process.cwd(), 'uploads', path)
    if (!existsSync(fullPath)) {
      return c.json({ error: 'File not found' }, 404)
    }
    const data = await readFile(fullPath)
    const ext = path.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    return new Response(data, {
      headers: { 'Content-Type': contentTypes[ext || ''] || 'application/octet-stream' },
    })
  } catch {
    return c.json({ error: 'File serving unavailable in this environment' }, 501)
  }
})

// ============================================================================
// Auth routes
// ============================================================================

app.post('/api/auth/signup', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }

  const db = getDb()
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  })
  if (existing.rows.length > 0) {
    return c.json({ error: 'User already exists' }, 409)
  }

  const userId = generateId()
  const passwordHash = await hashPassword(password)
  const profileId = generateId()

  await db.batch([
    {
      sql: `INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`,
      args: [userId, email.toLowerCase(), passwordHash],
    },
    {
      sql: `INSERT INTO user_profiles (id, user_id, email, share_id) VALUES (?, ?, ?, ?)`,
      args: [profileId, userId, email.toLowerCase(), userId],
    },
  ])

  const token = await createToken({ id: userId, email: email.toLowerCase() })
  return c.json({ token, user: { id: userId, email: email.toLowerCase() } })
})

app.post('/api/auth/signin', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT id, email, password_hash FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  })
  if (result.rows.length === 0) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const row = result.rows[0]
  const valid = await verifyPassword(password, row.password_hash as string)
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const userId = row.id as string
  const profile = await db.execute({
    sql: 'SELECT is_banned FROM user_profiles WHERE user_id = ?',
    args: [userId],
  })
  if (profile.rows.length > 0 && profile.rows[0].is_banned === 1) {
    return c.json({ error: 'Your account has been banned. Please contact support if you believe this is an error.' }, 403)
  }

  const token = await createToken({ id: userId, email: row.email as string })
  return c.json({ token, user: { id: userId, email: row.email as string } })
})

app.post('/api/auth/magic-link', async (c) => {
  const { email } = await c.req.json<{ email: string }>()
  if (!email) {
    return c.json({ error: 'Email is required' }, 400)
  }

  const db = getDb()
  let userResult = await db.execute({
    sql: 'SELECT id, email FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  })

  let userId: string
  if (userResult.rows.length === 0) {
    userId = generateId()
    const profileId = generateId()
    const passwordHash = await hashPassword(generateMagicToken())
    await db.batch([
      {
        sql: `INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`,
        args: [userId, email.toLowerCase(), passwordHash],
      },
      {
        sql: `INSERT INTO user_profiles (id, user_id, email, share_id) VALUES (?, ?, ?, ?)`,
        args: [profileId, userId, email.toLowerCase(), userId],
      },
    ])
  } else {
    userId = userResult.rows[0].id as string
  }

  const token = generateMagicToken()
  const tokenId = generateId()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  await db.execute({
    sql: `INSERT INTO magic_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [tokenId, userId, token, expiresAt],
  })

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const magicLink = `${appUrl}/auth/verify?token=${token}`

  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: email.toLowerCase(),
        subject: 'Sign in to Sculpt Sequences',
        html: `<p>Click <a href="${magicLink}">here</a> to sign in. This link expires in 15 minutes.</p>`,
      }),
    })
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`[dev] Magic link for ${email}: ${magicLink}`)
  } else {
    return c.json({ error: 'Email service not configured. Set RESEND_API_KEY to enable magic links.' }, 503)
  }

  return c.json({ message: 'Check your email for the magic link' })
})

app.get('/api/auth/verify-magic-link', async (c) => {
  const token = c.req.query('token')
  if (!token) {
    return c.json({ error: 'Token is required' }, 400)
  }

  const db = getDb()
  const result = await db.execute({
    sql: `SELECT mt.user_id, mt.expires_at, mt.used, u.email
          FROM magic_tokens mt
          JOIN users u ON u.id = mt.user_id
          WHERE mt.token = ?`,
    args: [token],
  })

  if (result.rows.length === 0) {
    return c.json({ error: 'Invalid or expired link' }, 400)
  }

  const row = result.rows[0]
  if (row.used === 1) {
    return c.json({ error: 'This link has already been used' }, 400)
  }
  if (new Date(row.expires_at as string) < new Date()) {
    return c.json({ error: 'This link has expired' }, 400)
  }

  await db.execute({
    sql: 'UPDATE magic_tokens SET used = 1 WHERE token = ?',
    args: [token],
  })

  const userId = row.user_id as string
  const email = row.email as string
  const jwt = await createToken({ id: userId, email })
  return c.json({ token: jwt, user: { id: userId, email } })
})

app.get('/api/auth/me', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getDb()

  const profile = await db.execute({
    sql: 'SELECT is_banned FROM user_profiles WHERE user_id = ?',
    args: [user.id],
  })
  if (profile.rows.length > 0 && profile.rows[0].is_banned === 1) {
    return c.json({ error: 'Account banned' }, 403)
  }

  return c.json({ user })
})

// ============================================================================
// Poses
// ============================================================================

app.get('/api/poses', async (c) => {
  const db = getDb()
  const result = await db.execute('SELECT * FROM poses ORDER BY name')
  return c.json(result.rows)
})

app.post('/api/poses', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ name: string; author_id?: string }>()
  const id = generateId()
  const db = getDb()

  await db.execute({
    sql: `INSERT INTO poses (id, name, author_id) VALUES (?, ?, ?)`,
    args: [id, body.name, body.author_id || user.id],
  })

  const result = await db.execute({ sql: 'SELECT * FROM poses WHERE id = ?', args: [id] })
  return c.json(result.rows[0], 201)
})

app.patch('/api/poses/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ name?: string; author_id?: string | null }>()
  const db = getDb()

  const updates: string[] = []
  const args: unknown[] = []
  if (body.name !== undefined) { updates.push('name = ?'); args.push(body.name) }
  if (body.author_id !== undefined) { updates.push('author_id = ?'); args.push(body.author_id) }
  updates.push("updated_at = datetime('now')")
  args.push(id)

  await db.execute({
    sql: `UPDATE poses SET ${updates.join(', ')} WHERE id = ?`,
    args,
  })

  const result = await db.execute({ sql: 'SELECT * FROM poses WHERE id = ?', args: [id] })
  return c.json(result.rows[0])
})

app.delete('/api/poses/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM poses WHERE id = ?', args: [id] })
  return c.json({ success: true })
})

// ============================================================================
// Pose Variations
// ============================================================================

app.get('/api/pose-variations', async (c) => {
  const poseId = c.req.query('pose_id')
  const db = getDb()

  const result = poseId
    ? await db.execute({
        sql: 'SELECT * FROM pose_variations WHERE pose_id = ? ORDER BY name',
        args: [poseId],
      })
    : await db.execute('SELECT * FROM pose_variations ORDER BY name')

  return c.json(result.rows.map((row) => formatPoseVariation(row)))
})

app.post('/api/pose-variations', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<Record<string, unknown>>()
  const id = generateId()
  const db = getDb()

  await db.execute({
    sql: `INSERT INTO pose_variations (id, pose_id, name, is_default, author_id, cue_1, cue_2, cue_3, breath_transition, image_url, transitional_cues)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      body.pose_id,
      body.name,
      boolToInt(!!body.is_default),
      body.author_id || user.id,
      body.cue_1 || null,
      body.cue_2 || null,
      body.cue_3 || null,
      body.breath_transition || null,
      body.image_url || null,
      JSON.stringify(body.transitional_cues || []),
    ],
  })

  const result = await db.execute({ sql: 'SELECT * FROM pose_variations WHERE id = ?', args: [id] })
  return c.json(formatPoseVariation(result.rows[0]), 201)
})

app.patch('/api/pose-variations/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Record<string, unknown>>()
  const db = getDb()

  const fieldMap: Record<string, unknown> = {
    pose_id: body.pose_id,
    name: body.name,
    is_default: body.is_default !== undefined ? boolToInt(!!body.is_default) : undefined,
    author_id: body.author_id,
    cue_1: body.cue_1,
    cue_2: body.cue_2,
    cue_3: body.cue_3,
    breath_transition: body.breath_transition,
    image_url: body.image_url,
    transitional_cues: body.transitional_cues !== undefined ? JSON.stringify(body.transitional_cues) : undefined,
  }

  const updates: string[] = []
  const args: unknown[] = []
  for (const [key, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`)
      args.push(value)
    }
  }
  updates.push("updated_at = datetime('now')")
  args.push(id)

  await db.execute({
    sql: `UPDATE pose_variations SET ${updates.join(', ')} WHERE id = ?`,
    args,
  })

  const result = await db.execute({ sql: 'SELECT * FROM pose_variations WHERE id = ?', args: [id] })
  return c.json(formatPoseVariation(result.rows[0]))
})

app.delete('/api/pose-variations/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM pose_variations WHERE id = ?', args: [id] })
  return c.json({ success: true })
})

app.post('/api/pose-variations/:id/image', requireAuth, async (c) => {
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `pose-images/variations/${id}-${Date.now()}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())
  const url = await uploadFile(path, buffer, file.type)

  const db = getDb()
  await db.execute({
    sql: `UPDATE pose_variations SET image_url = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [url, id],
  })

  const result = await db.execute({ sql: 'SELECT * FROM pose_variations WHERE id = ?', args: [id] })
  return c.json(formatPoseVariation(result.rows[0]))
})

app.delete('/api/pose-variations/:id/image', requireAuth, async (c) => {
  const id = c.req.param('id')
  const db = getDb()
  const existing = await db.execute({ sql: 'SELECT image_url FROM pose_variations WHERE id = ?', args: [id] })
  if (existing.rows.length > 0 && existing.rows[0].image_url) {
    await deleteFileByUrl(existing.rows[0].image_url as string, 'pose-images')
  }
  await db.execute({
    sql: `UPDATE pose_variations SET image_url = NULL, updated_at = datetime('now') WHERE id = ?`,
    args: [id],
  })
  return c.json({ success: true })
})

// ============================================================================
// Sequences
// ============================================================================

app.get('/api/sequences', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM sequences WHERE user_id = ? ORDER BY display_order ASC, name ASC`,
    args: [user.id],
  })
  return c.json(result.rows.map((row) => formatSequence(row)))
})

app.get('/api/sequences/public/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM sequences WHERE id = ?', args: [id] })
  if (result.rows.length === 0) return c.json(null)
  return c.json(formatSequence(result.rows[0]))
})

app.get('/api/sequences/published/:userId', async (c) => {
  const userId = c.req.param('userId')
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM sequences WHERE user_id = ? AND published_to_profile = 1 ORDER BY display_order ASC, name ASC`,
    args: [userId],
  })
  return c.json(result.rows.map((row) => formatSequence(row)))
})

app.get('/api/sequences/check-variation/:variationId', async (c) => {
  const variationId = c.req.param('variationId')
  const db = getDb()
  const result = await db.execute('SELECT name, sections FROM sequences')
  const sequences = result.rows.map((row) => ({
    name: row.name as string,
    sections: parseJson(row.sections, []),
  }))
  const sequenceNames = findSequencesUsingVariation(sequences, variationId)
  return c.json({ used: sequenceNames.length > 0, sequenceNames })
})

app.post('/api/sequences', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<Record<string, unknown>>()
  const id = generateId()
  const db = getDb()

  const maxOrder = await db.execute({
    sql: 'SELECT MAX(display_order) as max_order FROM sequences WHERE user_id = ?',
    args: [user.id],
  })
  const nextOrder = Number(maxOrder.rows[0]?.max_order ?? -1) + 1

  await db.execute({
    sql: `INSERT INTO sequences (id, user_id, name, sections, share_id, display_order, published_to_profile)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      user.id,
      body.name,
      JSON.stringify(body.sections || []),
      body.share_id || null,
      nextOrder,
      boolToInt(!!body.published_to_profile),
    ],
  })

  const result = await db.execute({ sql: 'SELECT * FROM sequences WHERE id = ?', args: [id] })
  return c.json(formatSequence(result.rows[0]), 201)
})

app.patch('/api/sequences/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json<Record<string, unknown>>()
  const db = getDb()

  const fieldMap: Record<string, unknown> = {
    name: body.name,
    sections: body.sections !== undefined ? JSON.stringify(body.sections) : undefined,
    share_id: body.share_id,
    display_order: body.display_order,
    published_to_profile: body.published_to_profile !== undefined ? boolToInt(!!body.published_to_profile) : undefined,
  }

  const updates: string[] = []
  const args: unknown[] = []
  for (const [key, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`)
      args.push(value)
    }
  }
  updates.push("updated_at = datetime('now')")
  args.push(id, user.id)

  await db.execute({
    sql: `UPDATE sequences SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    args,
  })

  const selectResult = await db.execute({
    sql: 'SELECT * FROM sequences WHERE id = ? AND user_id = ?',
    args: [id, user.id],
  })

  if (selectResult.rows.length === 0) {
    return c.json({ error: 'Sequence not found' }, 404)
  }
  return c.json(formatSequence(selectResult.rows[0]))
})

app.delete('/api/sequences/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM sequences WHERE id = ? AND user_id = ?', args: [id, user.id] })
  return c.json({ success: true })
})

app.post('/api/sequences/reorder', requireAuth, async (c) => {
  const user = c.get('user')
  const { sequenceIds } = await c.req.json<{ sequenceIds: string[] }>()
  const db = getDb()

  const statements = sequenceIds.map((id, index) => ({
    sql: `UPDATE sequences SET display_order = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
    args: [index, id, user.id],
  }))

  await db.batch(statements)
  return c.json({ success: true })
})

// ============================================================================
// User Profiles
// ============================================================================

app.get('/api/profiles/me', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM user_profiles WHERE user_id = ?',
    args: [user.id],
  })
  if (result.rows.length === 0) return c.json(null)
  return c.json(formatUserProfile(result.rows[0]))
})

app.get('/api/profiles/share/:shareId', async (c) => {
  const shareId = c.req.param('shareId')
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM user_profiles WHERE share_id = ?',
    args: [shareId],
  })
  if (result.rows.length === 0) return c.json(null)
  return c.json(formatUserProfile(result.rows[0]))
})

app.get('/api/profiles/user/:userId', async (c) => {
  const userId = c.req.param('userId')
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM user_profiles WHERE user_id = ?',
    args: [userId],
  })
  if (result.rows.length === 0) return c.json(null)
  return c.json(formatUserProfile(result.rows[0]))
})

app.post('/api/profiles/me', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<Record<string, unknown>>()
  const id = generateId()
  const db = getDb()

  try {
    await db.execute({
      sql: `INSERT INTO user_profiles (id, user_id, email, name, bio, events, share_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        user.id,
        body.email || user.email,
        body.name || '',
        body.bio || '',
        JSON.stringify(body.events || []),
        body.share_id || user.id,
      ],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('UNIQUE constraint failed') && message.includes('share_id')) {
      return c.json({ error: 'This custom link is already taken. Please choose another.' }, 409)
    }
    throw err
  }

  const result = await db.execute({ sql: 'SELECT * FROM user_profiles WHERE user_id = ?', args: [user.id] })
  return c.json(formatUserProfile(result.rows[0]), 201)
})

app.patch('/api/profiles/me', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<Record<string, unknown>>()
  const db = getDb()

  const fieldMap: Record<string, unknown> = {
    name: body.name,
    bio: body.bio,
    email: body.email,
    events: body.events !== undefined ? JSON.stringify(body.events) : undefined,
    share_id: body.share_id,
    venmo_username: body.venmo_username,
    profile_photo_url: body.profile_photo_url,
    spotify_playlist_urls: body.spotify_playlist_urls !== undefined ? JSON.stringify(body.spotify_playlist_urls) : undefined,
    is_banned: body.is_banned !== undefined ? boolToInt(!!body.is_banned) : undefined,
  }

  const updates: string[] = []
  const args: unknown[] = []
  for (const [key, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`)
      args.push(value)
    }
  }
  updates.push("updated_at = datetime('now')")
  args.push(user.id)

  try {
    await db.execute({
      sql: `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      args,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('UNIQUE constraint failed') && message.includes('share_id')) {
      return c.json({ error: 'This custom link is already taken. Please choose another.' }, 409)
    }
    throw err
  }

  const result = await db.execute({ sql: 'SELECT * FROM user_profiles WHERE user_id = ?', args: [user.id] })
  return c.json(formatUserProfile(result.rows[0]))
})

app.post('/api/profiles/me/photo', requireAuth, async (c) => {
  const user = c.get('user')
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `profile-photos/${user.id}/photo-${Date.now()}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())
  const url = await uploadFile(path, buffer, file.type)

  const db = getDb()
  await db.execute({
    sql: `UPDATE user_profiles SET profile_photo_url = ?, updated_at = datetime('now') WHERE user_id = ?`,
    args: [url, user.id],
  })

  return c.json({ url })
})

app.delete('/api/profiles/me/photo', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getDb()
  const existing = await db.execute({
    sql: 'SELECT profile_photo_url FROM user_profiles WHERE user_id = ?',
    args: [user.id],
  })
  if (existing.rows.length > 0 && existing.rows[0].profile_photo_url) {
    await deleteFileByUrl(existing.rows[0].profile_photo_url as string, 'profile-photos')
  }
  await db.execute({
    sql: `UPDATE user_profiles SET profile_photo_url = NULL, updated_at = datetime('now') WHERE user_id = ?`,
    args: [user.id],
  })
  return c.json({ success: true })
})

// ============================================================================
// Permissions
// ============================================================================

app.get('/api/permissions/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId')
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT permissions FROM user_profiles WHERE user_id = ?',
    args: [userId],
  })
  if (result.rows.length === 0) return c.json({})
  return c.json(parseJson(result.rows[0].permissions, {}))
})

app.get('/api/permissions/:userId/check/:key', requireAuth, async (c) => {
  const userId = c.req.param('userId')
  const key = c.req.param('key')
  const allowed = await hasPermission(userId, key)
  return c.json({ allowed })
})

// ============================================================================
// Admin
// ============================================================================

app.get('/api/admin/users', requireAuth, async (c) => {
  const user = c.get('user')
  if (!(await isAdmin(user.id))) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const db = getDb()
  const result = await db.execute(`
    SELECT up.*, u.email as user_email
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    ORDER BY up.email ASC
  `)

  const users = result.rows.map((row) => ({
    ...formatUserProfile(row),
    email: row.user_email as string || row.email as string,
  }))

  return c.json(users)
})

app.patch('/api/admin/users/:userId/permissions', requireAuth, async (c) => {
  const admin = c.get('user')
  if (!(await isAdmin(admin.id))) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const userId = c.req.param('userId')
  const { permissions } = await c.req.json<{ permissions: Record<string, boolean> }>()
  const db = getDb()

  await db.execute({
    sql: `UPDATE user_profiles SET permissions = ?, updated_at = datetime('now') WHERE user_id = ?`,
    args: [JSON.stringify(permissions), userId],
  })

  return c.json({ success: true })
})

app.patch('/api/admin/users/:userId/ban', requireAuth, async (c) => {
  const admin = c.get('user')
  if (!(await isAdmin(admin.id))) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const userId = c.req.param('userId')
  const { is_banned } = await c.req.json<{ is_banned: boolean }>()
  const db = getDb()

  await db.execute({
    sql: `UPDATE user_profiles SET is_banned = ?, updated_at = datetime('now') WHERE user_id = ?`,
    args: [boolToInt(is_banned), userId],
  })

  return c.json({ success: true })
})

export default app

import { Context, Next } from 'hono'
import { getTokenFromHeader, verifyToken, type AuthUser } from './auth.js'

export type AppVariables = {
  user: AuthUser
}

export async function requireAuth(c: Context, next: Next) {
  const token = getTokenFromHeader(c.req.header('Authorization'))
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const user = await verifyToken(token)
  if (!user) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  c.set('user', user)
  await next()
}

export async function optionalAuth(c: Context, next: Next) {
  const token = getTokenFromHeader(c.req.header('Authorization'))
  if (token) {
    const user = await verifyToken(token)
    if (user) c.set('user', user)
  }
  await next()
}

// @ts-nocheck
import { handle } from '@hono/node-server/vercel'
import app from '../server/app.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

const baseHandle = handle(app)

export default async function handler(req, res) {
  try {
    const incoming = typeof req.url === 'string' ? req.url : '/api/route'
    const parsed = new URL(incoming, 'http://localhost')
    const rewrittenPath = parsed.searchParams.get('__path')

    if (rewrittenPath) {
      parsed.searchParams.delete('__path')
      const search = parsed.searchParams.toString()
      req.url = search ? `${rewrittenPath}?${search}` : rewrittenPath
    }
  } catch (err) {
    console.error('Failed to restore API path:', err)
  }

  return baseHandle(req, res)
}

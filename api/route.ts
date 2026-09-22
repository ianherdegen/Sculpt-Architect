// @ts-nocheck
import app from '../server/app.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
  // Vercel's body helper drains the IncomingMessage before we can read it.
  // The stream then never ends, and any POST that calls c.req.json() waits
  // until FUNCTION_INVOCATION_TIMEOUT (504). Read the raw bytes ourselves.
  api: {
    bodyParser: false,
  },
}

function getHeader(req, name) {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function bufferRequestBody(req) {
  const method = (req.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') {
    return Promise.resolve(null)
  }

  // Attach listeners synchronously, before the handler awaits anything.
  // On Vercel the body stream is already flowing; a listener attached a
  // tick later misses the bytes and never sees "end".
  return new Promise((resolve, reject) => {
    const chunks = []
    const cleanup = () => {
      req.off?.('data', onData)
      req.off?.('end', onEnd)
      req.off?.('error', onError)
    }
    const onData = (chunk) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const onEnd = () => {
      cleanup()
      resolve(Buffer.concat(chunks))
    }
    const onError = (err) => {
      cleanup()
      reject(err)
    }
    req.on('data', onData)
    req.on('end', onEnd)
    req.on('error', onError)
    if (typeof req.resume === 'function') req.resume()
    if (req.readableEnded) onEnd()
  })
}

function restorePath(req) {
  const incoming = typeof req.url === 'string' ? req.url : '/api/route'
  const parsed = new URL(incoming, 'http://localhost')
  const rewrittenPath = parsed.searchParams.get('__path')
  if (!rewrittenPath) return incoming

  parsed.searchParams.delete('__path')
  const search = parsed.searchParams.toString()
  return search ? `${rewrittenPath}?${search}` : rewrittenPath
}

export default async function handler(req, res) {
  const bodyPromise = bufferRequestBody(req)

  try {
    const pathAndQuery = restorePath(req)
    const host = getHeader(req, 'host') || 'localhost'
    const proto = getHeader(req, 'x-forwarded-proto') || 'https'
    const url = `${proto}://${host}${pathAndQuery}`

    const method = (req.method || 'GET').toUpperCase()
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null || key.startsWith(':')) continue
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
      else headers.set(key, value)
    }

    const init = { method, headers }
    headers.delete('content-length')
    headers.delete('transfer-encoding')
    headers.delete('connection')

    const body = await bodyPromise
    if (body?.length) {
      init.body = new Uint8Array(body)
    }

    const request = new Request(url, init)
    const response = await app.fetch(request)

    res.statusCode = response.status
    const setCookies = response.headers.getSetCookie?.() ?? []
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (lower === 'transfer-encoding' || lower === 'set-cookie') return
      res.setHeader(key, value)
    })
    if (setCookies.length) res.setHeader('set-cookie', setCookies)

    const ab = await response.arrayBuffer()
    res.end(Buffer.from(ab))
  } catch (err) {
    console.error('API handler error:', err)
    if (res.headersSent || res.writableEnded) return
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: err?.message || 'Internal server error' }))
  }
}

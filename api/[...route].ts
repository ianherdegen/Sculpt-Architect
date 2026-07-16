// @ts-nocheck
import { handle } from '@hono/node-server/vercel'
import app from '../server/app.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
  api: {
    bodyParser: false,
  },
}

export default handle(app)

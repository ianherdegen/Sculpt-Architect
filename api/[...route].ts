// @ts-nocheck
import { handle } from 'hono/vercel'
import app from '../server/app.js'

export const config = {
  runtime: 'edge',
}

export default handle(app)

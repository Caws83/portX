import type { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'PortX API',
    mode: env.enableDemoQuotes ? 'demo' : 'live',
  }))
}

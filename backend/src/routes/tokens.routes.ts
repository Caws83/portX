import type { FastifyInstance } from 'fastify'
import { DEMO_TOKENS } from '../data/tokens.js'

export async function tokensRoutes(app: FastifyInstance) {
  app.get('/tokens', async () => ({
    count: DEMO_TOKENS.length,
    tokens: DEMO_TOKENS,
  }))
}

import type { FastifyInstance } from 'fastify'
import { DEMO_BASKETS } from '../data/demoBaskets.js'

export async function basketsRoutes(app: FastifyInstance) {
  app.get('/baskets', async () => ({
    count: DEMO_BASKETS.length,
    baskets: DEMO_BASKETS,
  }))
}

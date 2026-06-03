import type { FastifyInstance } from 'fastify'
import { getTokensWithLivePrices } from '../services/coingecko.js'

export async function tokensRoutes(app: FastifyInstance) {
  app.get('/tokens', async () => {
    const tokens = await getTokensWithLivePrices()
    return {
      count: tokens.length,
      tokens,
    }
  })
}

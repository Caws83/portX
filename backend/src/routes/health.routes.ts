import type { FastifyInstance } from 'fastify'
import { getPricingStatus, getTokenPrices } from '../services/coingecko.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await getTokenPrices()
    const { pricing, cacheAge } = getPricingStatus()

    if (pricing === 'coingecko') {
      return {
        status: 'ok',
        pricing: 'coingecko',
        cacheAge,
      }
    }

    return {
      status: 'ok',
      pricing: 'fallback',
    }
  })
}

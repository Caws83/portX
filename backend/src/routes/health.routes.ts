import type { FastifyInstance } from 'fastify'
import { getPricingStatus, getTokenPrices } from '../services/coingecko.js'
import { isZeroExConfigured } from '../services/zeroEx.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await getTokenPrices()
    const { pricing, cacheAge } = getPricingStatus()
    const quotes = isZeroExConfigured() ? '0x' : 'fallback'

    if (pricing === 'coingecko') {
      return {
        status: 'ok',
        pricing: 'coingecko',
        quotes,
        cacheAge,
      }
    }

    return {
      status: 'ok',
      pricing: 'fallback',
      quotes,
    }
  })
}

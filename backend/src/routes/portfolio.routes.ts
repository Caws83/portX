import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { NOTABLE_PORTFOLIOS } from '../data/notablePortfolios.js'
import { getPortfolioForWallet } from '../services/portfolioService.js'

const walletParamSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

export async function portfolioRoutes(app: FastifyInstance) {
  app.get('/notable-portfolios', async () => ({
    count: NOTABLE_PORTFOLIOS.length,
    disclaimer:
      'Demo/model portfolios for discovery only. Ownership of public figures or companies is not verified.',
    portfolios: NOTABLE_PORTFOLIOS,
  }))

  app.get('/portfolio/demo/:walletAddress', async (request) => {
    const { walletAddress } = walletParamSchema.parse(request.params)
    return {
      mode: 'demo',
      portfolio: getPortfolioForWallet(walletAddress),
    }
  })
}

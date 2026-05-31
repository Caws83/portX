import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDemoAgentRules } from '../services/portfolioService.js'

const walletParamSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

export async function agentsRoutes(app: FastifyInstance) {
  app.get('/agents/rules/demo/:walletAddress', async (request) => {
    const { walletAddress } = walletParamSchema.parse(request.params)
    return getDemoAgentRules(walletAddress)
  })
}

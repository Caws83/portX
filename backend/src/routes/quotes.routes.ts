import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { buyBasketQuote, sellAllQuote, sellBasketQuote } from '../services/quoteEngine.js'
import { badRequest } from '../utils/errors.js'
import { getToken } from '../data/tokens.js'

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()

const buyBasketSchema = z.object({
  walletAddress: addressSchema,
  chainId: z.number().int().positive().default(1),
  inputToken: z.string().min(1),
  inputAmountUsd: z.number().positive(),
  basketId: z.string().min(1),
  slippageBps: z.number().int().min(1).max(5000).default(100),
})

const sellBasketSchema = z.object({
  walletAddress: addressSchema,
  chainId: z.number().int().positive().default(1),
  basketId: z.string().min(1),
  outputToken: z.string().min(1),
  slippageBps: z.number().int().min(1).max(5000).default(100),
  positionValueUsd: z.number().positive().optional(),
})

const sellAllSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive().default(1),
  outputToken: z.string().min(1),
  slippageBps: z.number().int().min(1).max(5000).default(100),
})

function assertToken(symbol: string) {
  if (!getToken(symbol)) throw badRequest(`Unknown token: ${symbol}`)
}

export async function quotesRoutes(app: FastifyInstance) {
  app.post('/quotes/buy-basket', async (request) => {
    const body = buyBasketSchema.parse(request.body)
    assertToken(body.inputToken)
    return buyBasketQuote(body)
  })

  app.post('/quotes/sell-basket', async (request) => {
    const body = sellBasketSchema.parse(request.body)
    assertToken(body.outputToken)
    return sellBasketQuote(body)
  })

  app.post('/quotes/sell-all', async (request) => {
    const body = sellAllSchema.parse(request.body)
    assertToken(body.outputToken)
    return sellAllQuote(body)
  })
}

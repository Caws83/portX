import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { ZodError } from 'zod'
import { env, isAllowedCorsOrigin } from './config/env.js'
import { AppError } from './utils/errors.js'
import { healthRoutes } from './routes/health.routes.js'
import { tokensRoutes } from './routes/tokens.routes.js'
import { basketsRoutes } from './routes/baskets.routes.js'
import { quotesRoutes } from './routes/quotes.routes.js'
import { portfolioRoutes } from './routes/portfolio.routes.js'
import { agentsRoutes } from './routes/agents.routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: !env.isProduction,
  })

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, false)
        return
      }
      if (isAllowedCorsOrigin(origin)) {
        cb(null, origin)
        return
      }
      if (!env.isProduction) {
        app.log.warn({ origin, allowed: env.corsOrigins }, 'CORS origin rejected')
      }
      cb(null, false)
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
      })
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: error.flatten(),
      })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('Unknown basket') || message.includes('Unknown token')) {
      return reply.status(404).send({ error: message })
    }
    app.log.error(error)
    return reply.status(500).send({
      error: env.isProduction ? 'Internal server error' : message,
    })
  })

  const registerAll = async (instance: FastifyInstance) => {
    await instance.register(healthRoutes)
    await instance.register(tokensRoutes)
    await instance.register(basketsRoutes)
    await instance.register(quotesRoutes)
    await instance.register(portfolioRoutes)
    await instance.register(agentsRoutes)
  }

  await registerAll(app)
  // Mirror for frontend client paths (VITE_PORTX_API_URL + /api/v1/...)
  await app.register(async (api) => {
    await registerAll(api)
  }, { prefix: '/api/v1' })

  return app
}

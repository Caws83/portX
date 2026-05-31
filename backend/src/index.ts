import { buildApp } from './app.js'
import { env } from './config/env.js'

async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.port, host: '0.0.0.0' })
    console.log(`PortX API listening on http://0.0.0.0:${env.port}`)
    console.log(`CORS origins: ${env.corsOrigins.join(', ')}`)
    console.log(`Mode: ${env.enableDemoQuotes ? 'demo' : 'live'}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()

import 'dotenv/config'

function parseOrigins(value: string | undefined): string[] {
  if (!value) return ['http://localhost:5173']
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  enableDemoQuotes: process.env.ENABLE_DEMO_QUOTES !== 'false',
  zeroXApiKey: process.env.ZEROX_API_KEY ?? '',
  oneInchApiKey: process.env.ONEINCH_API_KEY ?? '',
  isProduction: process.env.NODE_ENV === 'production',
}

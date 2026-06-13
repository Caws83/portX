import 'dotenv/config'

/** Strip quotes and trailing slashes — browsers never send Origin with a trailing slash. */
export function normalizeOrigin(origin: string): string {
  let value = origin.trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }
  return value.replace(/\/+$/, '')
}

function parseOrigins(value: string | undefined): string[] {
  const devDefault = ['http://localhost:5173']
  if (!value?.trim()) return devDefault

  const parsed = value
    .split(',')
    .map((part) => normalizeOrigin(part))
    .filter(Boolean)

  return parsed.length > 0 ? parsed : devDefault
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

export function isAllowedCorsOrigin(requestOrigin: string | undefined): boolean {
  if (!requestOrigin) return false
  const normalized = normalizeOrigin(requestOrigin)
  return env.corsOrigins.some((allowed) => normalizeOrigin(allowed) === normalized)
}

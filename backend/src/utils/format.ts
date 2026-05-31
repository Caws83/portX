export function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

export function shortAddress(address: string, chars = 4): string {
  if (address.length < 10) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

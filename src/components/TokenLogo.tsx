const CHAIN_LOGO: Record<string, string> = {
  ethereum: '⟠',
  base: '🔵',
  avalanche: '🔺',
  bsc: '🟡',
  solana: '◎',
}

const TOKEN_COLORS: Record<string, string> = {
  ETH: 'bg-indigo-500/30 text-indigo-200',
  BTC: 'bg-orange-500/30 text-orange-200',
  WBTC: 'bg-orange-500/30 text-orange-200',
  SOL: 'bg-purple-500/30 text-purple-200',
  LINK: 'bg-blue-500/30 text-blue-200',
  UNI: 'bg-pink-500/30 text-pink-200',
  AAVE: 'bg-violet-500/30 text-violet-200',
  USDC: 'bg-sky-500/30 text-sky-200',
  USDT: 'bg-emerald-500/30 text-emerald-200',
  DAI: 'bg-amber-500/30 text-amber-200',
  PEPE: 'bg-lime-500/30 text-lime-200',
  DOGE: 'bg-yellow-500/30 text-yellow-200',
}

interface TokenLogoProps {
  symbol: string
  logoUrl?: string
  size?: 'sm' | 'md'
  className?: string
}

export function TokenLogo({ symbol, logoUrl, size = 'sm', className = '' }: TokenLogoProps) {
  const dim = size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-7 w-7 text-[10px]'
  const color = TOKEN_COLORS[symbol.toUpperCase()] ?? 'bg-zinc-700/50 text-zinc-200'

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={`${dim} rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <span
      className={`${dim} inline-flex items-center justify-center rounded-full font-bold shrink-0 ${color} ${className}`}
      aria-hidden
    >
      {symbol.slice(0, 3).toUpperCase()}
    </span>
  )
}

interface ChainLogoProps {
  chain: string
  label?: string
  className?: string
}

export function ChainLogo({ chain, label, className = '' }: ChainLogoProps) {
  const icon = CHAIN_LOGO[chain.toLowerCase()] ?? '⬡'
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-portx-muted ${className}`}
      title={label ?? chain}
    >
      <span aria-hidden>{icon}</span>
      {label && <span>{label}</span>}
    </span>
  )
}

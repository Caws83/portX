import { Link } from 'react-router-dom'

const LOGO_SRC = '/portx-logo.png'
const LOGO_HEADER_SRC = '/portx-logo-header.png'

interface LogoProps {
  className?: string
  height?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'header'
  linkToHome?: boolean
}

const heights = {
  sm: 'h-10 sm:h-11',
  md: 'h-12 sm:h-14',
  lg: 'h-14 sm:h-16 md:h-[4.5rem] min-w-[140px] sm:min-w-[180px] md:min-w-[220px]',
  xl: 'h-[4.5rem] sm:h-[5.75rem] md:h-24 lg:h-[6.5rem] min-w-[180px] sm:min-w-[260px] md:min-w-[320px] lg:min-w-[360px]',
}

export function Logo({
  className = '',
  height = 'md',
  variant = 'default',
  linkToHome = true,
}: LogoProps) {
  const img = (
    <img
      src={variant === 'header' ? LOGO_HEADER_SRC : LOGO_SRC}
      alt="PortX — Trade portfolios like a single asset"
      className={`${heights[height]} w-auto object-contain object-left ${className}`}
    />
  )

  if (!linkToHome) return img

  return (
    <Link to="/" className="inline-flex items-center shrink-0 group">
      {img}
    </Link>
  )
}

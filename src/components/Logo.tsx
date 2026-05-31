import { Link } from 'react-router-dom'

const LOGO_SRC = '/portx-logo.png'

interface LogoProps {
  className?: string
  height?: 'sm' | 'md' | 'lg'
  linkToHome?: boolean
}

const heights = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-12 md:h-14',
}

export function Logo({ className = '', height = 'md', linkToHome = true }: LogoProps) {
  const img = (
    <img
      src={LOGO_SRC}
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

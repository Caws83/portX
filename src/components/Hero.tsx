import { Link } from 'react-router-dom'
import { Prism } from '@/components/Prism'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function Hero() {
  const showPrismAnimation = useMediaQuery('(min-width: 1024px)')

  return (
    <section className="relative -mt-[7.25rem] lg:-mt-[5.25rem] overflow-hidden pb-20 lg:min-h-screen lg:pb-0">
      <div className="absolute inset-0 pointer-events-none">
        {showPrismAnimation ? (
          <Prism
            color1="#00ff88"
            color2="#00d4ff"
            animationType="hover"
            suspendWhenOffscreen
            timeScale={0.5}
            scale={3.5}
            height={2.6}
            baseWidth={3.6}
            noise={0}
            glow={0.8}
            hueShift={-0.1}
            colorFrequency={1}
          />
        ) : (
          <div className="prism-container prism-fallback-active w-full h-full" />
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[7.25rem] lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:pt-[5.75rem] lg:pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Trade portfolios
          <br />
          <span className="gradient-text">like a single asset</span>
        </h1>
        <p className="text-lg md:text-xl text-white/90 font-medium max-w-2xl mx-auto mb-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
          Buy and sell crypto baskets as one position.
        </p>
        <p className="text-portx-green font-semibold text-lg mb-10">
          One click in. One click out.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/dashboard" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto">
            Launch App
          </Link>
          <Link to="/create-basket" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
            Create Basket
          </Link>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/mint" className="btn-secondary text-base px-6 py-3 w-full sm:w-auto">
            Buy NFT
          </Link>
          <Link to="/lending" className="btn-secondary text-base px-6 py-3 w-full sm:w-auto">
            Lending Preview
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { label: 'One-Tx Buy', desc: 'Enter a full basket in a single flow' },
            { label: 'Portfolio P&L', desc: 'Track value and targets in one view' },
            { label: 'Smart Exits', desc: 'Take-profit & stop-loss at portfolio level' },
          ].map((item) => (
            <div key={item.label} className="glass-panel-dark rounded-2xl p-6 text-left">
              <div className="relative z-10">
                <div className="text-portx-green font-semibold mb-1">{item.label}</div>
                <div className="text-sm text-white/70">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

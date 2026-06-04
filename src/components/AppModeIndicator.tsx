import { APP_MODE_BADGE_LABEL, APP_MODE_BANNER_MESSAGE, IS_TESTNET_MODE } from '@/config/appMode'
import { getActiveNetworkConfig } from '@/config/networks'
import { StatusBanner } from '@/components/ui/StatusBanner'

/** Small badge for navbar / settings — Production Preview or Testnet Mode */
export function AppModeBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-mono font-medium border rounded-full text-[10px] px-2 py-0.5 shrink-0 ${
        IS_TESTNET_MODE
          ? 'bg-portx-warning/10 text-portx-warning border-portx-warning/30'
          : 'bg-portx-blue/10 text-portx-blue border-portx-blue/30'
      } ${className}`}
      title={getActiveNetworkConfig().label}
    >
      {APP_MODE_BADGE_LABEL}
    </span>
  )
}

/** Global mode banner below navbar */
export function AppModeBanner() {
  return (
    <StatusBanner
      variant={IS_TESTNET_MODE ? 'warning' : 'info'}
      compact
      className="max-w-7xl mx-auto rounded-none sm:rounded-xl border-x-0 sm:border-x"
    >
      {APP_MODE_BANNER_MESSAGE}
    </StatusBanner>
  )
}

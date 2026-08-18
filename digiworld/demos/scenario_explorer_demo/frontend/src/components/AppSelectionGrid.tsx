import { ChevronRight } from 'lucide-react'
import { Stats } from '../api'

interface AppSelectionGridProps {
  stats: Stats
  onSelectApp: (appName: string) => void
}

export default function AppSelectionGrid({
  stats,
  onSelectApp,
}: AppSelectionGridProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Select an App to Explore
        </h2>
        <p className="text-gray-600">
          Choose an app to see its available scenarios and test them
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.apps.map((appName: string) => {
          // Get app metadata from backend (sourced from centralized registry)
          const appMeta = stats.app_metadata?.[appName] || {
            name: appName.charAt(0).toUpperCase() + appName.slice(1),
            icon: '📱',
          }
          const scenarioCount = stats.by_app[appName] || 0

          return (
            <button
              key={appName}
              onClick={() => onSelectApp(appName)}
              className="glass-card rounded-lg p-6 text-left transition-shadow group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-slate-100 p-3 rounded-lg text-4xl">
                  {appMeta.icon}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-1 transition-all" />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {appMeta.name}
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md font-medium">
                  {scenarioCount}{' '}
                  {scenarioCount === 1 ? 'scenario' : 'scenarios'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

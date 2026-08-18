import { Stats } from '../api'

interface StatsPanelProps {
  stats: Stats
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const scenariosWithInstances =
    stats.total_scenarios - stats.scenarios_without_instances
  const totalApps = stats.apps.length

  return (
    <div className="mb-8 text-center">
      <div className="flex justify-center items-center gap-6 text-gray-600 text-sm">
        <span>
          <span className="font-semibold text-gray-900">
            {stats.total_scenarios}
          </span>{' '}
          Total Scenarios
        </span>
        <span className="text-gray-300">|</span>
        <span>
          <span className="font-semibold text-gray-900">{totalApps}</span> Apps
        </span>
        <span className="text-gray-300">|</span>
        <span>
          <span className="font-semibold text-gray-900">
            {scenariosWithInstances}
          </span>{' '}
          With Instances
        </span>
        <span className="text-gray-300">|</span>
        <span>
          <span className="font-semibold text-gray-900">
            {stats.scenarios_without_instances}
          </span>{' '}
          Without Instances
        </span>
      </div>
    </div>
  )
}

import { Play, Info } from 'lucide-react'
import { Scenario } from '../api'

interface InstanceSelectionGridProps {
  scenarios: Scenario[]
  onSelectInstance: (scenario: Scenario) => void
  onViewDetails: (scenario: Scenario) => void
}

export default function InstanceSelectionGrid({
  scenarios,
  onSelectInstance,
  onViewDetails,
}: InstanceSelectionGridProps) {
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-lg p-5">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{scenarios[0].app_icon}</span>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {scenarios[0].task_name}
            </h3>
            <p className="text-gray-600 text-sm">Select an instance to test</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map(scenario => {
          return (
            <div
              key={scenario.id}
              className="glass-card rounded-lg p-5 transition-shadow"
            >
              <div className="mb-3">
                <h4 className="text-base font-semibold text-gray-900">
                  {scenario.instance_name || 'Default'}
                </h4>
              </div>

              {/* Parameters */}
              {Object.keys(scenario.parameters).length > 0 && (
                <div className="mb-4 space-y-1 p-3 bg-slate-50 rounded-md border border-slate-200">
                  {Object.entries(scenario.parameters).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-600 font-medium min-w-[80px]">
                        {key}:
                      </span>
                      <span className="text-gray-900 font-medium truncate flex-1">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onSelectInstance(scenario)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800 text-white py-2 px-4 rounded-md font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Play
                </button>
                <button
                  onClick={() => onViewDetails(scenario)}
                  className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Additional badges */}
              <div className="flex gap-2 mt-3">
                {scenario.has_additional_mockdata && (
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-medium">
                    Mock Data
                  </span>
                )}
                {scenario.compatible_profiles.length > 1 && (
                  <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-medium">
                    Multi-Profile
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

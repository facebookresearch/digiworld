// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Play, Layers } from 'lucide-react'
import { Scenario } from '../api'

interface ScenarioSelectionGridProps {
  scenarios: Scenario[]
  loading: boolean
  onSelectScenario: (taskName: string, scenarios: Scenario[]) => void
}

export default function ScenarioSelectionGrid({
  scenarios,
  loading,
  onSelectScenario,
}: ScenarioSelectionGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Group scenarios by task_name
  const groupedScenarios = scenarios.reduce(
    (acc, scenario) => {
      const key = scenario.task_name
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(scenario)
      return acc
    },
    {} as Record<string, Scenario[]>,
  )

  return (
    <div className="grid grid-cols-1 gap-4">
      {Object.entries(groupedScenarios).map(([taskName, taskScenarios]) => {
        const hasInstances =
          taskScenarios.length > 1 || taskScenarios[0].instance_name
        const firstScenario = taskScenarios[0]

        return (
          <button
            key={taskName}
            onClick={() => onSelectScenario(taskName, taskScenarios)}
            className="glass-card rounded-lg p-5 text-left transition-shadow group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{firstScenario.app_icon}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {taskName}
                    </h3>

                    <div className="flex flex-wrap gap-2 items-center">
                      {hasInstances && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-md">
                          <Layers className="w-3 h-3" />
                          {taskScenarios.length}{' '}
                          {taskScenarios.length === 1
                            ? 'instance'
                            : 'instances'}
                        </span>
                      )}

                      {firstScenario.has_additional_mockdata && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium rounded-md">
                          Mock Data
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show sample parameters if available */}
                {Object.keys(firstScenario.parameters).length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Sample Parameters:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(firstScenario.parameters)
                        .slice(0, 3)
                        .map(key => (
                          <span key={key} className="text-xs text-gray-600">
                            <span className="font-medium">{key}</span>
                          </span>
                        ))}
                      {Object.keys(firstScenario.parameters).length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{Object.keys(firstScenario.parameters).length - 3}{' '}
                          more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-md font-medium text-sm">
                  <Play className="w-4 h-4" />
                  Configure & Run
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

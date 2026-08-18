// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import { Shuffle, ArrowLeft } from 'lucide-react'
import {
  getScenarios,
  getStats,
  selectScenario,
  resetScenario,
  verifyTask,
  loadAssets,
  getRandomScenario,
  getUIStates,
  getThemes,
  Scenario,
  ScenarioDetails,
  UIState,
  ThemeOption,
  AssetTransferMethod,
} from './api'
import Header from './components/Header'
import StatsPanel from './components/StatsPanel'
import AppSelectionGrid from './components/AppSelectionGrid'
import ScenarioSelectionGrid from './components/ScenarioSelectionGrid'
import ScenarioDetailModal from './components/ScenarioDetailModal'
import PlayModal from './components/PlayModal'

function App() {
  const [view, setView] = useState<'apps' | 'scenarios'>('apps')
  const [selectedApp, setSelectedApp] = useState<string>('')
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
    null,
  )
  const [previewScenario, setPreviewScenario] = useState<Scenario | null>(null)
  const [detailScenario, setDetailScenario] = useState<ScenarioDetails | null>(
    null,
  )
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPlayModal, setShowPlayModal] = useState(false)
  const [context, setContext] = useState<string>('')
  const [resetInfo, setResetInfo] = useState<{
    profile: string
    initial_state_path: string
    initial_state_id: string
  } | null>(null)
  const [verificationResult, setVerificationResult] = useState<{
    completed: boolean
    message: string
    checks?: Record<string, number>
  } | null>(null)
  const [agentAnswer, setAgentAnswer] = useState<string>('')
  const [usesAnswer, setUsesAnswer] = useState<boolean>(false)
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [selectedUIState, setSelectedUIState] = useState<string>('default')
  const [availableUIStates, setAvailableUIStates] = useState<UIState[]>([])
  const [selectedTheme, setSelectedTheme] = useState<string>('default')
  const [availableThemes, setAvailableThemes] = useState<ThemeOption[]>([])
  // Instance selection: all instances for the selected task, selected instance ID
  const [taskInstances, setTaskInstances] = useState<Scenario[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('')
  // Asset transfer options
  const [assetMethod, setAssetMethod] = useState<AssetTransferMethod>('auto')
  const [assetWorkers, setAssetWorkers] = useState<number>(5)

  // Fetch scenarios with instances for selected app
  const { data: scenariosWithInstances, isLoading: scenariosLoading } =
    useQuery(
      ['scenarios', selectedApp],
      () => getScenarios(selectedApp || undefined, undefined, undefined),
      { enabled: view === 'scenarios' && !!selectedApp },
    )

  // Fetch scenarios without instances
  const { data: scenariosWithoutInstances } = useQuery(
    ['scenarios-no-instances'],
    () =>
      fetch('http://localhost:8000/api/scenarios/without-instances').then(res =>
        res.json(),
      ),
    { enabled: view === 'scenarios' && !!selectedApp },
  )

  // Combine and filter scenarios
  const scenarios = [
    ...(scenariosWithInstances || []),
    ...(scenariosWithoutInstances || []).filter(
      (s: Scenario) => s.app_name === selectedApp,
    ),
  ]

  // Fetch stats
  const { data: stats } = useQuery('stats', getStats)

  // Mutations
  const selectMutation = useMutation(selectScenario, {
    onSuccess: data => {
      setSelectedScenario(data.scenario)
      setUsesAnswer(data.uses_answer)
      setAgentAnswer('')
      const profiles = data.scenario.compatible_profiles ?? []
      setSelectedProfile(
        profiles.includes('default') ? 'default' : (profiles[0] ?? ''),
      )
      setSelectedUIState('default')
      setSelectedTheme('default')
      setContext('')
      setVerificationResult(null)
      // Fetch available UI states and themes for this app
      getUIStates(data.scenario.app_name)
        .then(states => setAvailableUIStates(states))
        .catch(() => setAvailableUIStates([]))
      getThemes(data.scenario.app_name)
        .then(themes => setAvailableThemes(themes))
        .catch(() => setAvailableThemes([]))
    },
  })

  const resetMutation = useMutation(
    (params: { profile?: string; theme?: string; uiState?: string }) =>
      resetScenario(params.profile, params.theme, params.uiState),
    {
      onSuccess: data => {
        setContext(data.context)
        setResetInfo({
          profile: data.profile,
          initial_state_path: data.initial_state_path,
          initial_state_id: data.initial_state_id,
        })
        setVerificationResult(null)
      },
    },
  )

  const loadAssetsMutation = useMutation(
    () =>
      loadAssets(
        selectedProfile || undefined,
        false,
        assetMethod,
        assetWorkers,
      ),
    {
      onSuccess: () => {},
    },
  )

  const verifyMutation = useMutation((answer?: string) => verifyTask(answer), {
    onSuccess: data => {
      setVerificationResult({
        completed: data.completed,
        message: data.message,
        checks: data.metrics?.checks,
      })
    },
  })

  const randomMutation = useMutation(
    () => getRandomScenario(undefined, undefined, false),
    {
      onSuccess: scenario => {
        setPreviewScenario(scenario)
        selectMutation.mutate(scenario.id)
      },
    },
  )

  // const detailMutation = useMutation(getScenarioDetails, {
  //   onSuccess: data => {
  //     setDetailScenario(data)
  //     setShowDetailModal(true)
  //   },
  // })

  // const _handleScenarioDetails = (scenario: Scenario) => {
  //   detailMutation.mutate(scenario.id)
  // }

  const handleSelectApp = (appName: string) => {
    setSelectedApp(appName)
    setView('scenarios')
  }

  const handleSelectScenario = (
    _taskName: string,
    taskScenarios: Scenario[],
  ) => {
    // Always open PlayModal — instances are a dropdown inside it
    setTaskInstances(taskScenarios)
    const first = taskScenarios[0]
    setPreviewScenario(first)
    setSelectedInstanceId(first.id)
    setShowPlayModal(true)
    selectMutation.mutate(first.id)
  }

  const handleInstanceChange = (instanceId: string) => {
    setSelectedInstanceId(instanceId)
    const inst = taskInstances.find(s => s.id === instanceId)
    if (inst) {
      setPreviewScenario(inst)
      setContext('')
      setResetInfo(null)
      setVerificationResult(null)
      selectMutation.mutate(instanceId)
    }
  }

  const handleBackToApps = () => {
    setView('apps')
    setSelectedApp('')
  }

  const handleRandomScenario = () => {
    setShowPlayModal(true)
    randomMutation.mutate()
  }

  const handleReset = () => {
    resetMutation.mutate({
      profile: selectedProfile || undefined,
      theme: selectedTheme !== 'default' ? selectedTheme : undefined,
      uiState: selectedUIState !== 'default' ? selectedUIState : undefined,
    })
  }

  const handleVerify = () => {
    verifyMutation.mutate(usesAnswer ? agentAnswer : undefined)
  }

  return (
    <div className="min-h-screen pb-16">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Panel */}
        {view === 'apps' && stats && <StatsPanel stats={stats} />}

        {/* Random Scenario Button - Standalone on Apps View */}
        {view === 'apps' && (
          <>
            <div className="flex justify-center mb-6">
              <button
                onClick={handleRandomScenario}
                disabled={randomMutation.isLoading}
                className="flex items-center gap-2 bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                <Shuffle className="w-5 h-5" />
                Play Random Scenario
              </button>
            </div>

            <div className="flex items-center justify-center mb-8">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-gray-500 text-sm font-medium">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
          </>
        )}

        {/* Action Bar - Scenarios View */}
        {view === 'scenarios' && (
          <div className="glass-card rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <button
                  onClick={handleBackToApps}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Apps
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={handleRandomScenario}
                  disabled={randomMutation.isLoading}
                  className="flex items-center gap-2 bg-primary-900 hover:bg-primary-800 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 text-sm"
                >
                  <Shuffle className="w-4 h-4" />
                  Play Random Scenario
                </button>
              </div>
              <div className="flex-1 flex justify-end">
                {scenarios && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <span className="font-medium">
                      {
                        Object.keys(
                          scenarios.reduce(
                            (acc, s) => ({ ...acc, [s.task_name]: true }),
                            {},
                          ),
                        ).length
                      }{' '}
                      unique scenarios
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* App Selection View */}
        {view === 'apps' && stats && (
          <AppSelectionGrid stats={stats} onSelectApp={handleSelectApp} />
        )}

        {/* Scenario Selection View */}
        {view === 'scenarios' && (
          <>
            {/* App Header */}
            {selectedApp && scenarios && scenarios.length > 0 && (
              <div className="glass-card rounded-lg p-5 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{scenarios[0].app_icon}</span>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">
                      {scenarios[0].app_display_name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Select a scenario to configure and run
                    </p>
                  </div>
                </div>
              </div>
            )}

            <ScenarioSelectionGrid
              scenarios={scenarios || []}
              loading={scenariosLoading}
              onSelectScenario={handleSelectScenario}
            />
          </>
        )}

        {/* Play Modal */}
        {showPlayModal && (
          <PlayModal
            scenario={selectedScenario}
            previewScenario={previewScenario}
            isInitializing={
              selectMutation.isLoading || randomMutation.isLoading
            }
            taskInstances={taskInstances}
            selectedInstanceId={selectedInstanceId}
            onInstanceChange={handleInstanceChange}
            context={context}
            resetInfo={resetInfo}
            verificationResult={verificationResult}
            resetLoading={resetMutation.isLoading}
            loadAssetsLoading={loadAssetsMutation.isLoading}
            loadAssetsResult={loadAssetsMutation.data ?? null}
            assetMethod={assetMethod}
            assetWorkers={assetWorkers}
            onAssetMethodChange={setAssetMethod}
            onAssetWorkersChange={setAssetWorkers}
            verifyLoading={verifyMutation.isLoading}
            usesAnswer={usesAnswer}
            agentAnswer={agentAnswer}
            onAgentAnswerChange={setAgentAnswer}
            selectedProfile={selectedProfile}
            compatibleProfiles={
              selectedScenario?.compatible_profiles ??
              previewScenario?.compatible_profiles ??
              []
            }
            onProfileChange={setSelectedProfile}
            selectedUIState={selectedUIState}
            availableUIStates={availableUIStates}
            onUIStateChange={setSelectedUIState}
            selectedTheme={selectedTheme}
            availableThemes={availableThemes}
            onThemeChange={setSelectedTheme}
            onLoadAssets={() => loadAssetsMutation.mutate()}
            onReset={handleReset}
            onVerify={handleVerify}
            onClose={() => {
              setShowPlayModal(false)
              setSelectedScenario(null)
              setPreviewScenario(null)
              setContext('')
              setResetInfo(null)
              setVerificationResult(null)
              setAgentAnswer('')
              setUsesAnswer(false)
              setSelectedProfile('')
              setSelectedUIState('default')
              setAvailableUIStates([])
              setSelectedTheme('default')
              setAvailableThemes([])
              setTaskInstances([])
              setSelectedInstanceId('')
            }}
          />
        )}

        {/* Detail Modal */}
        {showDetailModal && detailScenario && (
          <ScenarioDetailModal
            scenario={detailScenario}
            onClose={() => {
              setShowDetailModal(false)
              setDetailScenario(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App

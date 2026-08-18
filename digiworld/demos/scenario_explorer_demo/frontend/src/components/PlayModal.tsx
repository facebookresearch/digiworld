// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  X,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Play,
  MessageSquare,
  User,
  Monitor,
  Palette,
  Layers,
  Upload,
} from 'lucide-react'
import { Scenario, UIState, ThemeOption, AssetTransferMethod } from '../api'

interface ResetInfo {
  profile: string
  initial_state_path: string
  initial_state_id: string
}

interface PlayModalProps {
  scenario: Scenario | null
  previewScenario: Scenario | null
  isInitializing: boolean
  taskInstances: Scenario[]
  selectedInstanceId: string
  onInstanceChange: (instanceId: string) => void
  context: string
  resetInfo: ResetInfo | null
  verificationResult: {
    completed: boolean
    message: string
    checks?: Record<string, number>
  } | null
  resetLoading: boolean
  loadAssetsLoading: boolean
  loadAssetsResult: { success: boolean; message: string } | null
  assetMethod: AssetTransferMethod
  assetWorkers: number
  onAssetMethodChange: (m: AssetTransferMethod) => void
  onAssetWorkersChange: (w: number) => void
  verifyLoading: boolean
  usesAnswer: boolean
  agentAnswer: string
  onAgentAnswerChange: (value: string) => void
  selectedProfile: string
  compatibleProfiles: string[]
  onProfileChange: (profile: string) => void
  selectedUIState: string
  availableUIStates: UIState[]
  onUIStateChange: (uiState: string) => void
  selectedTheme: string
  availableThemes: ThemeOption[]
  onThemeChange: (theme: string) => void
  onLoadAssets: () => void
  onReset: () => void
  onVerify: () => void
  onClose: () => void
}

export default function PlayModal({
  scenario,
  previewScenario,
  isInitializing,
  taskInstances,
  selectedInstanceId,
  onInstanceChange,
  context,
  resetInfo,
  verificationResult,
  resetLoading,
  loadAssetsLoading,
  loadAssetsResult,
  assetMethod,
  assetWorkers,
  onAssetMethodChange,
  onAssetWorkersChange,
  verifyLoading,
  usesAnswer,
  agentAnswer,
  onAgentAnswerChange,
  selectedProfile,
  compatibleProfiles,
  onProfileChange,
  selectedUIState,
  availableUIStates,
  onUIStateChange,
  selectedTheme,
  availableThemes,
  onThemeChange,
  onLoadAssets,
  onReset,
  onVerify,
  onClose,
}: PlayModalProps) {
  // Use previewScenario for immediate display, fallback to scenario when loaded
  const displayScenario = scenario || previewScenario

  // Compute dynamic step numbers based on which optional selectors are visible
  const hasInstances = taskInstances.length > 1
  const hasUIStates = availableUIStates.length > 1
  const hasThemes = availableThemes.length > 1
  let step = 0
  const instanceStep = hasInstances ? ++step : 0
  const profileStep = ++step
  const uiStateStep = hasUIStates ? ++step : 0
  const themeStep = hasThemes ? ++step : 0
  const resetStep = ++step
  const contextStep = ++step
  const answerStep = usesAnswer ? ++step : 0
  const verifyStep = ++step

  // Determine which profile would be auto-selected (same logic as _pick_profile)
  const defaultProfile = compatibleProfiles.includes('default')
    ? 'default'
    : (compatibleProfiles[0] ?? '')

  // Sort so the default profile appears first
  const sortedProfiles = [
    defaultProfile,
    ...compatibleProfiles.filter(p => p !== defaultProfile),
  ].filter(Boolean)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-primary-900 p-5 text-white border-b border-primary-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {displayScenario ? (
                <div className="bg-white/10 p-2 rounded-lg text-3xl">
                  {displayScenario.app_icon}
                </div>
              ) : (
                <div className="bg-white/10 p-2 rounded-lg">
                  <Play className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-semibold">
                    {displayScenario?.app_display_name || 'Loading...'}
                  </h2>
                  {isInitializing && (
                    <div className="flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-md">
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-sm">Initializing...</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-200 text-sm">
                  {displayScenario?.task_name || 'Loading scenario...'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
          {/* Loading State */}
          {isInitializing && (
            <div className="flex flex-col items-center justify-center py-20">
              <RotateCcw className="w-14 h-14 text-primary-900 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Initializing Scenario
              </h3>
              <p className="text-gray-600 text-center max-w-md text-sm">
                Setting up the app connection and preparing the scenario
                environment...
              </p>
              <div className="mt-6 space-y-2 text-sm text-gray-500">
                <p className="flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-primary-900 rounded-full animate-pulse"></span>
                  Connecting to emulator
                </p>
                <p className="flex items-center gap-2">
                  <span
                    className="inline-block w-1.5 h-1.5 bg-primary-900 rounded-full animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  ></span>
                  Loading scenario configuration
                </p>
                <p className="flex items-center gap-2">
                  <span
                    className="inline-block w-1.5 h-1.5 bg-primary-900 rounded-full animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  ></span>
                  Initializing ADB actions
                </p>
              </div>
            </div>
          )}

          {/* Scenario Info */}
          {!isInitializing && scenario && (
            <div className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="flex items-start gap-3">
                <span className="text-4xl">{scenario.app_icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {scenario.app_display_name}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Instance: {scenario.instance_name || 'None'}
                    </span>
                  </div>

                  {/* Parameters */}
                  {Object.keys(scenario.parameters).length > 0 && (
                    <div className="bg-slate-50 rounded-md p-4 mt-3 border border-slate-200">
                      <p className="font-medium text-gray-900 mb-2 text-sm">
                        Task Parameters
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(scenario.parameters).map(
                          ([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="text-gray-600 font-medium">
                                {key}:
                              </span>{' '}
                              <span className="text-gray-900 font-medium">
                                {String(value)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Select Instance */}
          {!isInitializing && scenario && hasInstances && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-700 text-white w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm">
                  {instanceStep}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Select Instance
                  </h4>
                  <p className="text-sm text-gray-600">
                    Choose task parameters ({taskInstances.length} variations)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <select
                  value={selectedInstanceId}
                  onChange={e => onInstanceChange(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  {taskInstances.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.instance_name || 'default'}
                      {Object.keys(inst.parameters).length > 0
                        ? ` — ${Object.entries(inst.parameters)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Select Profile */}
          {!isInitializing && scenario && compatibleProfiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 text-white w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm">
                  {profileStep}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Select Profile
                  </h4>
                  <p className="text-sm text-gray-600">
                    Choose which user profile to load as initial state
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <select
                  value={selectedProfile}
                  onChange={e => onProfileChange(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white"
                >
                  {sortedProfiles.map(profile => (
                    <option key={profile} value={profile}>
                      {profile}
                      {profile === defaultProfile ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Select Initial UI State */}
          {!isInitializing && scenario && hasUIStates && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-600 text-white w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm">
                  {uiStateStep}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Select Initial UI State
                  </h4>
                  <p className="text-sm text-gray-600">
                    Choose which screen the app starts on
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <select
                  value={selectedUIState}
                  onChange={e => onUIStateChange(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white"
                >
                  {availableUIStates.map(state => (
                    <option key={state.id} value={state.id}>
                      {state.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Select Theme */}
          {!isInitializing && scenario && hasThemes && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-purple-700 text-white w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm">
                  {themeStep}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Select Theme
                  </h4>
                  <p className="text-sm text-gray-600">
                    Choose the visual theme for the app
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <select
                  value={selectedTheme}
                  onChange={e => onThemeChange(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                >
                  {availableThemes.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Load Assets */}
          {!isInitializing && scenario && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-amber-600 text-white w-8 h-8 rounded-md flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Load Assets{' '}
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      (one-time per emulator start)
                    </span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    Push images &amp; videos to device. Skipped automatically if
                    already done.
                  </p>
                </div>
              </div>

              {/* Transfer method + workers */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Transfer method
                  </label>
                  <select
                    value={assetMethod}
                    onChange={e =>
                      onAssetMethodChange(e.target.value as AssetTransferMethod)
                    }
                    disabled={loadAssetsLoading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:opacity-50"
                  >
                    <option value="auto">
                      Auto (parallel ≤5K files, zip above)
                    </option>
                    <option value="parallel">Parallel — raw adb push</option>
                    <option value="zip">
                      Zip → push → unzip (~3× faster, 5K+ files)
                    </option>
                  </select>
                </div>
                {assetMethod !== 'zip' && (
                  <div className="w-44">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Workers
                    </label>
                    <select
                      value={assetWorkers}
                      onChange={e =>
                        onAssetWorkersChange(Number(e.target.value))
                      }
                      disabled={loadAssetsLoading}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:opacity-50"
                    >
                      <option value={5}>5 workers (recommended)</option>
                      <option value={8}>8 workers</option>
                      <option value={12}>12 workers (Eats)</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                onClick={onLoadAssets}
                disabled={loadAssetsLoading}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadAssetsLoading ? (
                  <>
                    <RotateCcw className="w-5 h-5 animate-spin" />
                    Pushing assets...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Load Assets
                  </>
                )}
              </button>

              {loadAssetsResult && (
                <div
                  className={`p-3 rounded-md border text-sm ${
                    loadAssetsResult.success
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {loadAssetsResult.message}
                </div>
              )}
            </div>
          )}

          {/* Reset */}
          {!isInitializing && scenario && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary-900 text-white w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm">
                  {resetStep}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Reset App to Initial State
                  </h4>
                  <p className="text-sm text-gray-600">
                    Prepare the app with the scenario's initial state
                  </p>
                </div>
              </div>
              <button
                onClick={onReset}
                disabled={resetLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? (
                  <>
                    <RotateCcw className="w-5 h-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    Reset App
                  </>
                )}
              </button>

              {/* Reset result */}
              {resetInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm space-y-1">
                  <p className="font-semibold text-blue-900">
                    State reset to profile:{' '}
                    <span className="font-mono">{resetInfo.profile}</span>
                  </p>
                  <p className="text-blue-800">
                    <span className="font-medium">State ID:</span>{' '}
                    <span className="font-mono">
                      {resetInfo.initial_state_id}
                    </span>
                  </p>
                  <p className="text-blue-800 break-all">
                    <span className="font-medium">Path:</span>{' '}
                    <span className="font-mono text-xs">
                      {resetInfo.initial_state_path}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Task Description and Context */}
          {!isInitializing && scenario && context && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-secondary-700 text-white w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm">
                  {contextStep}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Task Description & Context
                  </h4>
                  <p className="text-sm text-gray-600">
                    Information provided to the agent
                  </p>
                </div>
              </div>
              <div className="bg-gray-900 text-gray-100 p-5 rounded-md overflow-auto max-h-80">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {context}
                </pre>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                <p className="text-amber-900 text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Now perform the task manually on the Android emulator, then
                  verify below
                </p>
              </div>
            </div>
          )}

          {/* Agent Answer (conditional) */}
          {!isInitializing && scenario && context && usesAnswer && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-violet-700 text-white w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm">
                  {answerStep}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Provide Agent Answer
                  </h4>
                  <p className="text-sm text-gray-600">
                    This is an information-retrieval task. Enter the answer the
                    agent would provide.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-violet-600 flex-shrink-0" />
                <input
                  type="text"
                  value={agentAnswer}
                  onChange={e => onAgentAnswerChange(e.target.value)}
                  placeholder="Enter the agent's answer (e.g. '6 subscribers')"
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>
          )}

          {/* Verify */}
          {!isInitializing && scenario && context && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-700 text-white w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm">
                  {verifyStep}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Verify Task Completion
                  </h4>
                  <p className="text-sm text-gray-600">
                    Check if the task was completed correctly
                  </p>
                </div>
              </div>
              <button
                onClick={onVerify}
                disabled={verifyLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifyLoading ? (
                  <>
                    <RotateCcw className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Verify Task Completion
                  </>
                )}
              </button>

              {/* Verification Result */}
              {verificationResult && (
                <div
                  className={`p-5 rounded-md border ${
                    verificationResult.completed
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {verificationResult.completed ? (
                      <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <h5
                        className={`font-semibold text-base ${
                          verificationResult.completed
                            ? 'text-emerald-900'
                            : 'text-red-900'
                        }`}
                      >
                        {verificationResult.completed
                          ? 'Task Completed Successfully'
                          : 'Task Not Completed'}
                      </h5>
                      <p
                        className={`mt-1 text-sm ${
                          verificationResult.completed
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }`}
                      >
                        {verificationResult.message}
                      </p>
                    </div>
                  </div>

                  {verificationResult.checks && (
                    <div
                      className={`mt-4 pt-4 border-t ${
                        verificationResult.completed
                          ? 'border-emerald-200'
                          : 'border-red-200'
                      }`}
                    >
                      <p
                        className={`text-sm font-medium mb-2 ${
                          verificationResult.completed
                            ? 'text-emerald-800'
                            : 'text-red-800'
                        }`}
                      >
                        Verification checks:
                      </p>
                      <ul className="space-y-1">
                        {Object.entries(verificationResult.checks).map(
                          ([name, value]) => (
                            <li
                              key={name}
                              className={`text-sm flex items-center gap-2 ${
                                verificationResult.completed
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                              }`}
                            >
                              {value === 1.0 ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              )}
                              <span className="font-mono">{name}</span>:{' '}
                              {value === 1.0 ? 'PASS' : 'FAIL'}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {verificationResult.completed &&
                    !verificationResult.checks && (
                      <div className="mt-4 pt-4 border-t border-emerald-200">
                        <p className="text-sm text-emerald-800 font-medium mb-2">
                          What happened under the hood:
                        </p>
                        <ol className="list-decimal list-inside text-sm text-emerald-700 space-y-1">
                          <li>
                            Current app state was captured from the emulator
                          </li>
                          <li>Database was queried for expected changes</li>
                          <li>Task completion logic verified the changes</li>
                          <li>Verification passed successfully</li>
                        </ol>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-5 bg-white">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-6 rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

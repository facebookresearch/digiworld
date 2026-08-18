// Copyright (c) Meta Platforms, Inc. and affiliates.
const API_BASE = 'http://localhost:8000/api'

export interface Scenario {
  id: string
  app_name: string
  app_display_name: string
  app_icon: string
  task_name: string
  instance_name: string | null
  bundle_id: string
  parameters: Record<string, any>
  difficulty: string
  compatible_profiles: string[]
  has_additional_mockdata: boolean
  validated: boolean
  validation: {
    validated: boolean
    last_validated: string
    validated_by: string
    notes: string
  }
  metadata: Record<string, any>
}

export interface ScenarioDetails extends Scenario {
  verifier_info?: {
    class_name: string
    class_file: string
    documentation: string
    logic: string
  }
}

export interface AppMetadata {
  name: string
  icon: string
  bundle_id: string
}

export interface Stats {
  total_scenarios: number
  scenarios_without_instances: number
  validated: number
  not_validated: number
  by_app: Record<string, number>
  by_difficulty: Record<string, number>
  apps: string[]
  app_metadata: Record<string, AppMetadata>
}

export interface SelectScenarioResponse {
  success: boolean
  scenario: Scenario
  uses_answer: boolean
  message: string
}

export interface ResetResponse {
  success: boolean
  context: string
  profile: string
  initial_state_path: string
  initial_state_id: string
  message: string
}

export interface VerifyResponse {
  success: boolean
  completed: boolean
  uses_answer: boolean
  metrics: Record<string, any>
  message: string
}

export async function getScenarios(
  app?: string,
  difficulty?: string,
  validation?: string,
): Promise<Scenario[]> {
  const params = new URLSearchParams()
  if (app) params.append('app', app)
  if (difficulty) params.append('difficulty', difficulty)
  if (validation) params.append('validation', validation)

  const response = await fetch(`${API_BASE}/scenarios?${params}`)
  if (!response.ok) throw new Error('Failed to fetch scenarios')
  return response.json()
}

export async function getScenariosWithoutInstances(): Promise<Scenario[]> {
  const response = await fetch(`${API_BASE}/scenarios/without-instances`)
  if (!response.ok) {
    throw new Error('Failed to fetch scenarios without instances')
  }
  return response.json()
}

export async function getStats(): Promise<Stats> {
  const response = await fetch(`${API_BASE}/stats`)
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}

export async function getScenarioDetails(
  scenarioId: string,
): Promise<ScenarioDetails> {
  const response = await fetch(`${API_BASE}/scenario/${scenarioId}`)
  if (!response.ok) throw new Error('Failed to fetch scenario details')
  return response.json()
}

export async function selectScenario(
  scenarioId: string,
): Promise<SelectScenarioResponse> {
  const response = await fetch(`${API_BASE}/scenario/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId }),
  })
  if (!response.ok) throw new Error('Failed to select scenario')
  return response.json()
}

export interface UIState {
  id: string
  route: string
  description: string
  screen_name: string
}

export async function getUIStates(appName: string): Promise<UIState[]> {
  const response = await fetch(`${API_BASE}/ui-states/${appName}`)
  if (!response.ok) throw new Error('Failed to fetch UI states')
  return response.json()
}

export interface ThemeOption {
  id: string
  name: string
}

export async function getThemes(appName: string): Promise<ThemeOption[]> {
  const response = await fetch(`${API_BASE}/themes/${appName}`)
  if (!response.ok) throw new Error('Failed to fetch themes')
  return response.json()
}

export async function resetScenario(
  profile?: string,
  theme?: string,
  uiState?: string,
): Promise<ResetResponse> {
  const response = await fetch(`${API_BASE}/scenario/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: profile ?? null,
      theme: theme ?? null,
      ui_state: uiState ?? null,
    }),
  })
  if (!response.ok) throw new Error('Failed to reset scenario')
  return response.json()
}

export interface LoadAssetsResponse {
  success: boolean
  profile: string
  method: string
  message: string
}

export type AssetTransferMethod = 'auto' | 'parallel' | 'zip'

export async function loadAssets(
  profile?: string,
  force: boolean = false,
  method: AssetTransferMethod = 'auto',
  workers: number = 5,
): Promise<LoadAssetsResponse> {
  const response = await fetch(`${API_BASE}/scenario/load-assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: profile ?? null, force, method, workers }),
  })
  if (!response.ok) throw new Error('Failed to load assets')
  return response.json()
}

export async function verifyTask(
  agentAnswer?: string,
): Promise<VerifyResponse> {
  const response = await fetch(`${API_BASE}/scenario/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_answer: agentAnswer ?? null }),
  })
  if (!response.ok) throw new Error('Failed to verify task')
  return response.json()
}

export async function getRandomScenario(
  app?: string,
  difficulty?: string,
  validatedOnly: boolean = false,
): Promise<Scenario> {
  const params = new URLSearchParams()
  if (app) params.append('app', app)
  if (difficulty) params.append('difficulty', difficulty)
  if (validatedOnly) params.append('validated_only', 'true')

  const response = await fetch(`${API_BASE}/scenario/random?${params}`)
  if (!response.ok) throw new Error('Failed to fetch random scenario')
  return response.json()
}

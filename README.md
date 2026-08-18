# DigiWorld

A benchmark framework for evaluating AI agents on reproducible mobile app tasks. DigiWorld provides scenarios across 15 Android applications, with automated state management, template-driven data generation, and programmatic verification of task completion.

## Documentation

| Area | What it covers | Where |
|------|----------------|-------|
| **General / Framework** | Installing DigiWorld, the CLI, the Python API, scenario authoring, and architecture — everything about the benchmark framework itself. | This README (sections below) |
| **Mock Applications** | The 15 React Native Android apps under test: building, running, and per-app schemas and documentation. | [apps/README.md](apps/README.md) |
| **Evaluation** | Running a vision-language agent against the apps on an emulator and scoring each task with the built-in verifiers. | [digiworld_eval/README.md](digiworld_eval/README.md) |
| **Container** | Running the emulator, the apps and the eval server inside Docker or Podman instead of installing them locally. | [docker/README.md](docker/README.md) |
| **Scenario Explorer Demo** | Interactive web UI for browsing and validating scenarios. | [digiworld/demos/scenario_explorer_demo/README.md](digiworld/demos/scenario_explorer_demo/README.md) |
| **ADB Interaction Layer** | Low-level library that drives the emulator over ADB. | [digiworld/docs/api/adb_readme.md](digiworld/docs/api/adb_readme.md) |

**Jump to a section in this README:** [Installation](#installation) · [Quick Start](#quick-start) · [CLI Reference](#cli-reference) · [Data](#data) · [Evaluation](#evaluation) · [Python API](#python-api) · [Architecture](#architecture) · [Testing](#testing) · [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

- Python 3.12
- [Git LFS](https://git-lfs.com) (state data and media assets are stored with LFS)
- Android Debug Bridge (ADB)
- A running Android emulator accessible via ADB

### Setup

```bash
# 1. Create an isolated environment (Python 3.12)
conda create -n digiworld python=3.12 -y
conda activate digiworld
# venv alternative: python3.12 -m venv .venv && source .venv/bin/activate

# 2. Install Git LFS and pull large files (state data, media assets)
git lfs install
git lfs pull

# 3. Install the digiworld package and its dependencies (editable)
cd digiworld
pip install -r requirements.txt
```

This installs both the `digiworld` package and its dependency `andojo-agent` (the ADB interaction layer) in editable mode.

Verify the installation:

```bash
digiworld --version
digiworld list
```

### Android emulator (ADB)

Most `digiworld` commands — and the [eval harness](digiworld_eval/README.md) — drive a
running Android emulator over ADB. Start an emulator, then confirm ADB can see it:

```bash
adb version                          # ADB is installed and on PATH
adb devices                          # should list e.g. "emulator-5554   device"
```

If no device is listed, boot one and wait for it to come online (the `emulator`
binary ships with the Android SDK; devices are created in Android Studio's Device
Manager):

```bash
emulator -list-avds                  # show available virtual devices
emulator -avd <avd_name> &           # boot one in the background
adb wait-for-device && adb devices   # wait until it reports "device"
```

If a device shows as `offline`/`unauthorized` or goes missing, restart the ADB server:

```bash
adb kill-server && adb start-server
```

### Running the tests

The unit suite runs without an emulator. Install the `test` extra (adds `pytest` plus
the dependencies the scenario registry imports), then run it from the repo root:

```bash
cd digiworld
pip install -e ".[test]"
cd ..
python -m pytest tests/unit/ -q
```

## Quick Start

### 1. Explore available scenarios

```bash
# List all scenarios across all apps
digiworld list

# Filter by app
digiworld list --app email

# Show detailed info including instances
digiworld list --verbose --instances

# Show aggregate statistics
digiworld stats
```

### 2. Run a scenario from Python

A scenario lifecycle has three phases: **instantiate**, **reset**, and **verify**.

```python
import digiworld
from digiworld.scenarios.scenario_registry import scenario_registry

# Instantiate a pre-configured test instance
scenario = scenario_registry.get_instance(
    app_name='email',
    task_name='Send email to',
    instance_name='personal_fjohnson_4',
    base_path=digiworld.get_state_data_path()
)

# Reset the app to a clean, reproducible initial state.
# This selects a compatible profile, loads state data onto the emulator,
# and resolves any mockdata templates.
scenario.reset_initial_state()

# --- Agent or human performs the task here ---

# Verify whether the task was completed by inspecting the final app state.
# Pass a list of state paths (or session IDs); only the final state is checked.
metrics = scenario.verify_trajectory(["path/to/final/state"])
print(f"Task completed: {metrics['task_completed']}")  # 1.0 or 0.0
```

### 3. Inspect a specific instance

```bash
digiworld info email send_email_to personal_fjohnson_4
```

### 4. Export all tasks to JSONL

```bash
digiworld export-tasks
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `digiworld create-variants` | Create theme variants for assembled profiles |
| `digiworld list` | List all scenarios (use `--app`, `--verbose`, `--instances`) |
| `digiworld stats` | Show scenario/instance counts and coverage statistics |
| `digiworld info <app> <task> <instance>` | Show details for a specific instance |
| `digiworld export-tasks` | Export all tasks to `tasks_list.jsonl` |
| `digiworld update-scenarios` | Regenerate `scenario_list.json` after adding/modifying scenarios |
| `digiworld list-states` | Show state data summary |
| `digiworld clean-states` | Clean non-default states (`--dry-run` to preview) |
| `digiworld --version` | Print version |

## Data

DigiWorld ships with all **profile mock data** pre-generated and committed to the
repository, so no generation step is required. Scenario instances (parameters and
per-instance mockdata) are likewise pre-generated and committed under each
scenario's `instances/` directory.

> **Note:** The LLM-based `generate-profiles` command has been removed along with
> the generation pipeline. Profile data is now sourced entirely from the committed
> `state_data/` directory.

### Profile Mock Data

Each app has ~10 named profiles (e.g., `default`, `high_balance`, `new_user`) that
vary parameters like data volume, balances, and statuses. Each profile directory
contains its mockdata, `rootstore.json`, SQLite database, and theme, and lives under:

```
digiworld/digiworld/state_data/<bundle_id>/<profile>/
```

### Theme Variants

Create theme variants for assembled profiles (variants share the same database and
mockdata, differing only by theme):

```bash
digiworld create-variants --app payment            # All profiles for one app
digiworld create-variants --app payment --profile big_spender
digiworld create-variants --list                   # List available themes
```

To inspect what data is present:

```bash
digiworld list-states
digiworld list --verbose
```

## Currently Supported Applications

DigiWorld covers 15 apps across 7 domains:

| Domain | Apps |
|--------|------|
| Communication | Email, Message |
| Financial | Payment, Banking |
| Shopping | Ecommerce, Qwikshop, Auction |
| Entertainment | Music, Video |
| On-Demand | Eats, Ryde |
| Travel | Flight Booking, Transit |
| Smart Living | Smart Home, Parking |

To see the full list of scenarios and instances:

```bash
digiworld list --verbose --instances
digiworld stats
```

For details on the individual mock applications (React Native setup, building APKs, app-level documentation), see [apps/README.md](apps/README.md).

## Evaluation

The `digiworld_eval/` directory is a standalone evaluation harness: it runs a
vision-language agent against these apps on an emulator and scores each task with the
built-in verifiers. It drives the emulator over a small HTTP bridge and calls models
via `litellm` (GPT / Claude / Gemini). Setup and run instructions
are in [digiworld_eval/README.md](digiworld_eval/README.md).

There are two ways to provide the emulator the harness drives:

- **A local emulator** — you install the Android SDK, boot an emulator and run the
  bridge server yourself. Works on Linux, macOS and Windows.
  See [digiworld_eval/README.md](digiworld_eval/README.md).
- **A container** — Docker or Podman runs the emulator, the pre-installed apps and
  the bridge server behind one port, and the harness can start and stop containers
  itself for parallel evaluation. Needs a Linux host with KVM.
  See [docker/README.md](docker/README.md).

Both expose the same HTTP API, so a config written for one runs against the other.

## Python API

### Core Objects

**`scenario_registry`** -- Singleton registry that auto-discovers all scenarios at import time.

```python
from digiworld.scenarios.scenario_registry import scenario_registry

# List all (app_name, task_name) pairs
scenario_registry.get_scenario_list()

# List all (app_name, task_name, instance_name) triples
scenario_registry.get_instance_list()

# Get a scenario with custom parameters
scenario_registry.get_scenario(
    app_name='payment',
    task_name='Change pin to',
    base_path=digiworld.get_state_data_path(),
    new_pin='5678'
)

# Get a pre-configured instance
scenario_registry.get_instance(
    app_name='email',
    task_name='Send email to',
    instance_name='personal_fjohnson_4',
    base_path=digiworld.get_state_data_path()
)

# Get instance configuration dict
scenario_registry.get_instance_config('email', 'Send email to', 'personal_fjohnson_4')
```

**`Scenario`** -- Abstract base class. All scenarios expose:

| Method | Description |
|--------|-------------|
| `reset_initial_state()` | Load a clean state onto the emulator and return the selected profile name |
| `verify_trajectory(state_paths)` | Check if the task was completed; returns `{'task_completed': float}` |
| `get_task_description()` | Human-readable task description for the agent |
| `get_agent_context()` | Full context dict for the agent (task description, app info, etc.) |
| `compare_database_records(db1, db2, query, params)` | Compare two database snapshots |

**`digiworld` module-level helpers:**

```python
import digiworld

digiworld.get_state_data_path()   # Path to state_data directory
digiworld.get_project_root()      # Path to digiworld/ project root
digiworld.get_package_dir()       # Path to digiworld/digiworld/ package dir
digiworld.get_apk_versions()      # Min compatible APK versions from lockfile
digiworld.get_bundle_id('email')  # Bundle ID for an app name
digiworld.get_all_app_names()     # All registered app names
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DIGIWORLD_STATE_DATA` | Override the default state_data directory. If the path does not exist, the built-in state_data is copied there automatically. |
| `DIGIWORLD_INCLUDE_THEME_VARIANTS` | Set to `false` to exclude theme variant profiles during `reset_initial_state()`. Defaults to `true`. |

## Architecture

### Scenario Lifecycle

```
1. Discovery     scenario_registry scans for scenario_config.json files
                  and registers (app_name, task_name) -> ScenarioClass mappings

2. Instantiation  scenario_registry.get_instance() creates a Scenario object,
                  loads app/scenario/instance configs, initializes helpers

3. Reset          reset_initial_state() selects a compatible profile, loads
                  state data via ADB, resolves mockdata templates

4. Execution      External: agent or human performs the task on the emulator

5. Verification   verify_trajectory() checks the final app state against
                  the scenario's completion criteria
```

### Composition-Based Design

The `Scenario` base class delegates to specialized helper services rather than implementing everything directly:

| Helper | Responsibility |
|--------|---------------|
| `ConfigLoader` | Loads and validates app, scenario, and instance configuration files |
| `StateManager` | Database connections, queries, state path resolution, snapshot comparison |
| `TemplateResolver` | Resolves `{{placeholder}}` templates in mockdata and context |
| `MockdataHandler` | Loads templated mockdata JSON and inserts it into databases |
| `MockdataValidator` | Validates mockdata JSON files against database schemas |
| `ContextExtractor` | Extracts user context (email, ID, etc.) from databases and JSON stores |
| `PositioningService` | Generates timestamps positioned relative to existing database content |
| `AnswerMatchers` | Flexible comparison functions for verification (numeric, date, duration, etc.) |
| `Constraints` | Feasibility constraint types (`EntityExistsConstraint`, `DataVolumeConstraint`, `BalanceConstraint`) |

### Creating a New Scenario

Each scenario lives in its own directory under `digiworld/digiworld/scenarios/scenarios/<app_name>/<task_dir>/` and consists of several files:

| File | Purpose |
|------|---------|
| `scenario_config.json` | Declares the task name, app, parameters, context fields, and mockdata requirements |
| `scenario.py` | Implements the verification logic |
| `instances/` | Pre-generated, committed test instances (parameters and per-instance mockdata) |
| `feasibility.py` | Declares constraints on which profiles are compatible (when the scenario depends on pre-existing data) |
| `__init__.py` | Minimal or empty |

#### Step 1: Design decisions

Before writing code, decide:

- **Mockdata injection**: Set `additional_mockdata: true` when the scenario operates on data that may not exist in all profiles (a specific video title, transaction, etc.). Omit it when the scenario works with data guaranteed to exist across profiles.
- **Parameters vs. context fields**: Parameters are `<param>` placeholders in the task name that become `self.<param>` at runtime. Context fields are runtime data extracted from the profile's DB/rootstore that the agent needs (e.g., `current_user_pin`). Only list fields the app's `ContextExtractor` can resolve.
- **Scenario context**: When the agent needs profile-dependent information (e.g., a user PIN that varies per profile), use `scenario_context` with template values like `"scenario_context": {"userPin": "{{current_user_pin}}"}`. Any template used must have its context field declared in `context_fields`.
- **Feasibility constraints**: Create `feasibility.py` whenever the scenario has preconditions on the profile's existing data. Available constraint types from `digiworld.scenarios.constraints`: `EntityExistsConstraint`, `DataVolumeConstraint`, `BalanceConstraint`.
- **Non-triviality**: After feasibility filtering, profiles where the task is already completed in the initial state are excluded. This filtering is already baked into the committed instances and requires no additional code in the scenario.

#### Step 2: Create the files

**`scenario_config.json`**:

```json
{
    "task_name": "Send $<amount> to <nickname>",
    "app_name": "payment",
    "scenario_class": "SendPaymentToNicknameScenario",
    "parameters": ["amount", "nickname"],
    "context_fields": ["current_user_pin"],
    "description": "Send a payment to a contact by nickname",
    "additional_mockdata": true
}
```

- `task_name` uses `<param>` placeholders that must exactly match the `parameters` list.
- `scenario_class` must exactly match the class name in `scenario.py` (case-sensitive).
- `app_name` must be a valid key in `APP_REGISTRY`.
- Optional `"time"` field: ISO 8601 string to set the device clock for time-sensitive tasks.

**`scenario.py`**:

```python
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

class SendPaymentToNicknameScenario(PaymentScenario, ComposableScenario):

    def _get_checks(self, state_path: str) -> list:
        query = """
            SELECT amount, recipientNickname, status
            FROM transactions
            WHERE recipientNickname = ? AND status = 'completed'
        """
        _, _, new_txns = self.compare_database_records(
            self.initial_state_path, state_path, query,
            (self.nickname,)
        )
        if not new_txns:
            raise ValueError(f"No completed transaction found for {self.nickname}")

        txn = list(new_txns)[0]
        return [
            ("amount", float(txn[0]), float(self.amount)),
            ("recipient", txn[1], self.nickname),
        ]
```

Key rules:
- Use parameterized SQL (`?` placeholders), never string interpolation.
- Raise `ValueError` when expected data is not found -- never return `False` silently.
- Class inherits from `(AppBaseScenario, ComposableScenario)` with the app base first.
- `self.<param>` attribute names match the `parameters` list exactly.

**`feasibility.py`** (when the scenario depends on pre-existing profile data):

```python
from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(
        table="transactions",
        min_count=2,
        user_filter=True,
    ),
]
```

#### Step 3: Validate and test

1. Verify that `scenario.py` imports resolve correctly and the scenario appears in `digiworld list`.
2. Run `digiworld update-scenarios` to regenerate the scenario list.
3. Add unit tests under `tests/unit/scenarios/apps/<app_name>_app/` that test the verification logic in isolation using in-memory SQLite databases.
4. Use the [Scenario Explorer Demo](digiworld/demos/scenario_explorer_demo/README.md) to manually run the scenario on an emulator and confirm that verification works end-to-end.

Refer to existing scenarios in the same app for conventions and patterns.

### Configuration Hierarchy

Configuration is loaded at three levels, each overriding the previous:

```
app_config.json          App-level: bundle ID, compatible profiles
  scenario_config.json   Scenario-level: task name, class, context fields, mockdata
    instance_config.json Instance-level: parameters, profiles, difficulty metadata
```

### Template System

Mockdata JSON files use `{{placeholder}}` syntax for dynamic data generation:

| Template | Resolves To |
|----------|-------------|
| `{{current_user_email}}` | Logged-in user's email |
| `{{current_user_id}}` | Logged-in user's ID |
| `{{auto_id}}` | Unique auto-generated ID |
| `{{recent_timestamp}}` | 1-48 hours ago |
| `{{past_timestamp}}` | Random past date |
| `{{random_phone}}` | Generated phone number |
| `{{beginning_timestamp}}` | Positioned after existing data (email/payment apps) |
| `{{middle_timestamp}}` | Positioned between existing data |
| `{{end_timestamp}}` | Positioned before existing data |
| `{{context_sender:work}}` | Work contact email (email app) |
| `{{context_sender:personal}}` | Personal contact email (email app) |

App-specific template resolvers (e.g., `EmailTemplateResolver`, `PaymentTemplateResolver`) extend the base set with domain-specific placeholders.

### Directory Structure

```
digiworld/
  apps/                             React Native applications (see apps/README.md)
  digiworld/                        Scenario framework, ADB layer, and data pipeline
    digiworld/                      Python package
      __init__.py                   Version, path helpers, app registry re-exports
      cli.py                        CLI entry point
      app_registry.py               App name/bundle ID mappings
      adb/                          ADB interaction layer
      pipeline/                     Data generation pipeline
      scenarios/
        scenario_base.py            Abstract Scenario base class
        scenario_registry.py        Auto-discovery and registration
        verification.py             TargetStateScenario and ComposableScenario mixins
        config_loader.py            Configuration loading and validation
        state_manager.py            Database and state operations
        template_resolver.py        Template placeholder resolution
        mockdata_handler.py         Mockdata loading and insertion
        mockdata_validator.py       Mockdata schema validation
        context_extractor.py        User context extraction
        positioning_service.py      Timestamp positioning
        answer_matchers.py          Flexible answer comparison (numeric, date, duration, etc.)
        constraints.py              Feasibility constraint definitions
        scenarios/                  Per-app scenario implementations
          auction/
          banking/
          eats/
          ecommerce/
          email/
          flightbooking/
          message/
          music/
          parking/
          payment/
          qwikshop/
          ryde/
          smarthome/
          transit/
          video/
      state_data/                   App state snapshots by profile
    demos/                          Demo applications
    utils/                          Utility scripts
    pyproject.toml                  Package configuration
    requirements.txt                Installation dependencies
```

## Testing

```bash
# Run all scenario tests
python -m pytest tests/unit/scenarios/ -v

# Run tests for a specific app
python -m pytest tests/unit/scenarios/apps/email_app/ -v
```

## Troubleshooting

**`ModuleNotFoundError: No module named 'digiworld'`**
- Run `pip install -r requirements.txt` from the `digiworld/` directory
- Verify you are in the correct virtual environment

**`ModuleNotFoundError: No module named 'adb_actions'`**
- The ADB layer is now part of the digiworld package at `digiworld.adb.actions`
- Run `pip install -r requirements.txt` from the `digiworld/` directory

**No scenarios found in registry**
- Ensure `digiworld/digiworld/scenarios/scenarios/` contains scenario folders with `scenario_config.json`
- Check that the scenario modules can be imported without errors

**ADB device not found**
- Ensure the Android emulator is running: `adb devices`
- Restart ADB: `adb kill-server && adb start-server`

**Missing state data or media files**
- Run `git lfs pull` from the repository root to download all LFS-tracked files

## Related Documentation

- [Mock Applications](apps/README.md) -- React Native apps: building, running, per-app docs and schemas
- [Evaluation Harness](digiworld_eval/README.md) -- Running an agent against the apps and scoring the result
- [Container Setup](docker/README.md) -- Docker / Podman image bundling the emulator, apps and eval server
- [Scenario Explorer Demo](digiworld/demos/scenario_explorer_demo/README.md) -- Interactive web UI for browsing and validating scenarios
- [ADB Interaction Layer](digiworld/docs/api/adb_readme.md) -- ADB interaction library

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for the full license text.

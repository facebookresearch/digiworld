# Test Suite

All tests run from the `digiworld/` directory using pytest.
The `pytest.ini` at the project root configures discovery paths, markers,
and Python path setup so imports work without manual `PYTHONPATH` manipulation.

```bash
cd digiworld
```

## Prerequisites

Install the test dependencies (from the digiworld package):

```bash
pip install -e digiworld[test]
```

This provides `pytest>=7.0` and `pytest-cov>=4.0`.  No additional packages
are required for any of the test suites described below.

---

## Test suites at a glance

| Suite | Location | Count | Requires emulator | Purpose |
|---|---|---|---|---|
| Framework unit tests | `tests/unit/scenarios/test_*.py` | ~80 | No | Core infrastructure modules |
| Scenario verifier tests | `tests/unit/scenarios/apps/` | ~30 | No | Per-app `_check_task_completion` logic |
| Instance integrity tests | `tests/unit/scenarios/test_instance_integrity/` | ~10 000 | No | Auto-discovered validation of all scenarios and instances |
| Inline scenario tests | `digiworld/digiworld/scenarios/scenarios/**/test_scenario.py` | ~190 | No | Co-located per-scenario verification tests |
| Inline instance-gen tests | `digiworld/digiworld/scenarios/scenarios/**/test_instance_gen.py` | ~40 | No | Co-located per-scenario instance generation tests |
| Integration tests | `tests/integration/` | ~20 | **Yes** | Full scenario reset/verify on a live emulator |

---

## 1. Framework unit tests

Test the core infrastructure modules that all scenarios depend on.
No emulator or external services needed.

```bash
# Run all framework unit tests
pytest tests/unit/scenarios/ --ignore=tests/unit/scenarios/apps \
       --ignore=tests/unit/scenarios/test_instance_integrity -v

# Run a specific module
pytest tests/unit/scenarios/test_template_resolver.py -v
pytest tests/unit/scenarios/test_mockdata_handler.py -v
```

### Modules covered

| File | What it tests |
|---|---|
| `test_config_loader.py` | Loading and validation of `scenario_config.json` files |
| `test_state_manager.py` | Database read/write operations used during scenario lifecycle |
| `test_mockdata_handler.py` | Mockdata collection, template resolution, and injection |
| `test_template_resolver.py` | `{{placeholder}}` resolution (`auto_id`, `current_user_id`, timestamps, etc.) |
| `test_scenario_registry.py` | Auto-discovery and registration of scenarios and instances |
| `test_context_extractor.py` | Extraction of user context from rootstore.json and DBs |
| `test_positioning_service.py` | Timestamp positioning within existing data ranges |
| `test_verification.py` | `TargetStateScenario` and `ComposableScenario` base classes |
| `test_integration.py` | Unit-level integration of multiple framework components |

---

## 2. Scenario verifier tests

Test the `_check_task_completion()` / `_get_checks()` methods that
determine whether an agent successfully completed a task.
Located under `tests/unit/scenarios/apps/<app_name>/`.

```bash
# All verifier tests
pytest tests/unit/scenarios/apps/ -v

# Single app
pytest tests/unit/scenarios/apps/apps.ryde/ -v
pytest tests/unit/scenarios/apps/apps.payment/ -v
```

### How they work

1. Create a mock SQLite DB or JSON state representing "before" and "after"
   task completion.
2. Call the scenario's verifier method directly.
3. Assert `False` for the incomplete state, `True` for the completed state.
4. Test edge cases (wrong parameter values should not count as completion).

### Apps with verifier tests

`apps.eats`, `apps.ecommerce`, `apps.email`, `message_app`, `apps.music`,
`apps.payment`, `apps.ryde`, `smarthome_app`, `apps.video`.

---

## 3. Instance integrity tests

Auto-discovered tests that validate **every** scenario and instance on
disk without needing an emulator or LLM.  These catch structural issues,
stale data, mockdata schema problems, and feasibility constraint violations.

```bash
# Full instance integrity suite (~10 000 tests, ~20 seconds)
pytest -m instance_integrity -v

# Shorter form
pytest tests/unit/scenarios/test_instance_integrity/ -v

# Filter by app
pytest -m instance_integrity -k "ryde"
pytest -m instance_integrity -k "payment"

# Filter by test category
pytest -m instance_integrity -k "test_compatible_profiles_exist"
pytest -m instance_integrity -k "test_mockdata_tables_exist"
pytest -m instance_integrity -k "test_mockdata_can_be_inserted"
```

### Test modules

| File | What it validates |
|---|---|
| `test_scenario_structure.py` | Every `scenario_config.json` has required keys, the declared class is importable, `instance_gen.py` exports the required interface, parameter placeholders match |
| `test_instance_config.py` | Every `instance_config.json` has correct parameters, non-empty `compatible_profiles` that exist in `state_data`, mockdata directory consistency |
| `test_mockdata_validation.py` | Mockdata tables exist in profile DBs, column names match schema, template placeholders are recognized, INTEGER columns get numeric values |
| `test_feasibility.py` | Re-evaluates feasibility constraints from `feasibility.py` against every declared compatible profile to catch stale profile lists |
| `test_mockdata_injection.py` | Copies a profile DB to a temp dir, resolves templates, INSERTs mockdata, and verifies DB integrity -- a dry-run of what happens at runtime |
| `test_registry_completeness.py` | Every on-disk scenario and instance is discoverable by `ScenarioRegistry` and its stored parameters match the disk config |

### Fixing failures

If instance integrity tests fail after profile data changes, run the
recheck command to update `compatible_profiles` and clean up empty
mockdata files (no LLM required):

```bash
# Recheck all instances
python -m digiworld.scenarios.generate_all --recheck

# Or via the CLI
digiworld recheck-instances

# Recheck a single app
digiworld recheck-instances --app music
```

---

## 4. Inline scenario tests

193 `test_scenario.py` and 38 `test_instance_gen.py` files co-located
with individual scenarios under `digiworld/digiworld/scenarios/scenarios/`.

These are **not** discovered by the default `pytest` run (which only looks
under `tests/`).  Run them explicitly:

```bash
# All inline tests (~1400 tests)
pytest digiworld/digiworld/scenarios/scenarios/ -v

# Single app's inline tests
pytest digiworld/digiworld/scenarios/scenarios/transit/ -v
pytest digiworld/digiworld/scenarios/scenarios/video/ -v

# Only instance generation tests
pytest digiworld/digiworld/scenarios/scenarios/ -k "test_instance_gen" -v

# Only scenario verification tests
pytest digiworld/digiworld/scenarios/scenarios/ -k "test_scenario" -v
```

### Coverage by app

| App | `test_scenario.py` | `test_instance_gen.py` |
|---|---|---|
| auction | 26 | 0 |
| banking | 30 | 0 |
| eats | 0 | 1 |
| ecommerce | 0 | 1 |
| email | 11 | 0 |
| flightbooking | 0 | 0 |
| message | 0 | 0 |
| music | 6 | 0 |
| parking | 10 | 7 |
| payment | 17 | 0 |
| qwikshop | 13 | 0 |
| ryde | 11 | 0 |
| smarthome | 21 | 1 |
| transit | 25 | 14 |
| video | 23 | 14 |

---

## 5. Integration tests

Full end-to-end tests that run against a **real Android emulator**.
They reset each scenario to its initial state and verify the task is
not yet completed (confirming the scenario requires agent action).

```bash
# Run integration tests (emulator must be connected)
pytest tests/integration/ -v

# Just the scenario reset/verify tests
pytest tests/integration/test_scenarios.py -v

# Theme switching tests
pytest tests/integration/test_theme_switching.py -v
```

**Requirements**: A connected Android emulator accessible via ADB, with
all DigiWorld apps installed.

---

## Markers

Defined in `pytest.ini`:

| Marker | Description | Usage |
|---|---|---|
| `unit` | Unit tests (no emulator) | `pytest -m unit` |
| `integration` | Requires a connected emulator | `pytest -m integration` |
| `emulator` | Requires a connected emulator (alias) | `pytest -m emulator` |
| `slow` | Long-running tests | `pytest -m slow` / `pytest -m "not slow"` |
| `instance_integrity` | Auto-discovered instance validation | `pytest -m instance_integrity` |

---

## Typical workflows

### Quick smoke test (no emulator, fast)

```bash
pytest tests/unit/ --ignore=tests/unit/scenarios/test_instance_integrity -q
```

### Full offline validation

```bash
# Framework + verifiers + instance integrity + inline tests
pytest tests/unit/ -q && pytest digiworld/digiworld/scenarios/scenarios/ -q
```

### After regenerating instances or changing profile data

```bash
# Re-evaluate compatible_profiles against current profile DBs
digiworld recheck-instances

# Then verify everything passes
pytest -m instance_integrity -q
```

### After editing a scenario's verification logic

```bash
# Run that scenario's inline test
pytest digiworld/digiworld/scenarios/scenarios/ryde/book_ride/test_scenario.py -v

# Run its verifier test (if one exists in tests/unit/scenarios/apps/)
pytest tests/unit/scenarios/apps/apps.ryde/ -v
```

### CI-friendly one-liner (all offline tests)

```bash
pytest tests/unit/ -q && pytest -m instance_integrity -q && pytest digiworld/digiworld/scenarios/scenarios/ -q
```

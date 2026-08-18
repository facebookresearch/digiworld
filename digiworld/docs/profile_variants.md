# Profile Variants

Profile variants extend the benchmark's coverage along presentation
dimensions (theme, UI starting screen, etc.) without duplicating data or
affecting instance generation.

## Core idea

A **base profile** is a self-contained directory that defines a complete data
state: database, mockdata, rootstore, and theme.  Instance generation and
constraint feasibility checking operate exclusively on base profiles.

A **variant** is a lightweight directory that symlinks all shared data back to
its base profile and overrides a single dimension:

| Variant type | What differs              | What is symlinked               |
|--------------|---------------------------|---------------------------------|
| `ui_state`   | `rootstore.json`          | `mockdata/`, `.db` files        |
| `theme`      | `theme.json`              | `mockdata/`, `sessions/`        |

Each variant directory contains a `_variant_of.json` marker:

```json
{
  "base_profile": "big_spender",
  "variant_type": "theme",
  "variant_detail": "midnight"
}
```

This marker is the single source of truth that the rest of the system uses to
distinguish variants from base profiles.

## Directory layout

```
state_data/com.andojopay.sbx/
  big_spender/                        <-- base profile
    theme.json
    mockdata/
      mock-wallets.json
      ...
    sessions/
      default/
        rootstore.json
        default.db

  big_spender-theme_midnight/         <-- theme variant
    _variant_of.json                  <-- marker
    theme.json                        <-- different theme (copied)
    mockdata -> ../big_spender/mockdata
    sessions -> ../big_spender/sessions

  big_spender-inbox_var0/             <-- UI state variant
    _variant_of.json                  <-- marker
    theme.json -> ../big_spender/theme.json
    mockdata -> ../big_spender/mockdata
    sessions/
      default/
        rootstore.json                <-- different rootstore (copied)
        default.db -> ../../big_spender/sessions/default/default.db

  .themes/                            <-- theme source files (hidden)
    ocean-blue.json
    midnight.json
    rose.json
    ...
```

## How it interacts with the pipeline

### Generation time (instance generation)

`ProfileCompatibilityChecker._list_profiles()` skips any directory that
contains a `_variant_of.json` marker. This means:

- Constraints are evaluated only against base profiles.
- `compatible_profiles` in `instance_config.json` lists only base profile
  names (e.g. `["big_spender", "default"]`).
- Adding or removing variants never requires regenerating instances.

### Runtime (benchmark execution)

`Scenario.reset_initial_state()` calls `expand_with_variants()` to augment
the `compatible_profiles` list with any variant directories whose marker
references a compatible base profile.  The expanded set is then fed to
`random.choice()`, so variants participate in profile selection automatically.

Because variants share the same underlying database (via symlink), every
constraint that passes for the base profile also passes for the variant.

## Environment variables

### `DIGIWORLD_INCLUDE_THEME_VARIANTS`

Controls whether theme variant profiles are included in runtime profile
selection.

| Value | Behavior |
|-------|----------|
| `true` (default) | Variant profiles are included alongside base profiles |
| `false` / `0` / `no` | Only base profiles are used; variants are ignored |

This is useful for:

- **Fast test runs:** skip the overhead of theme switching when you only
  care about functional correctness.
- **Controlled baselines:** run the benchmark with only the default theme
  to establish a baseline before comparing with theme variants.
- **Ablations:** run once with `true`, once with `false`, and compare.

```bash
# Disable theme variants for a test run
DIGIWORLD_INCLUDE_THEME_VARIANTS=false pytest tests/integration/test_scenarios.py -v

# Enable (default)
DIGIWORLD_INCLUDE_THEME_VARIANTS=true python -m apps.cua.eval config=...
```

When using the amaia-collab eval configs, this can be set as an environment
variable in the shell or added to the conda environment via
`scripts/set_env_vars_in_conda.py`.

### `DIGIWORLD_STATE_DATA`

Overrides the path to the `state_data` directory. When set and the path
does not exist, the default `state_data` is copied there automatically.
Used by the eval harness to provide each worker with its own copy.

## Ablations

To run a controlled ablation on a specific dimension, filter profile
selection at the evaluation harness level:

```bash
# Only default themes (base profiles only, no theme variants)
DIGIWORLD_INCLUDE_THEME_VARIANTS=false python run_benchmark.py

# All profiles including theme variants (default)
python run_benchmark.py
```

Since the profile name encodes the full initial state, all existing logging
and result tracking automatically captures which theme / UI state was used.

## Creating theme variants

### Prerequisites

Place theme JSON files in `state_data/{bundle_id}/.themes/`. Each file should
follow the standard theme schema (name, mode, colors, typography, etc.).
All 15 apps have generated themes in their `.themes/` directories.

### All apps, all profiles

```bash
python scripts/create_theme_variants.py --all
```

### Single app

```bash
python scripts/create_theme_variants.py --all payment
```

### Single profile

```bash
python scripts/create_theme_variants.py payment big_spender
```

### Subset of themes

```bash
python scripts/create_theme_variants.py payment big_spender --themes midnight rose
```

### Dry run

```bash
python scripts/create_theme_variants.py --all --dry-run
```

## Creating UI state variants

UI state variants require a prior enumeration step that captures the app's
navigable screens into `rootstore.json` snapshots.

### Step 1: Enumerate UI states

```bash
python scripts/enumerate_states.py email test-profile-1
```

This produces a `ui_states/{bundle_id}/{profile}/` directory with one
JSON file per enumerated screen and a `_state_summary.json` index.

### Step 2: Create variants

```bash
python scripts/create_profile_variants.py email test-profile-1
```

Creates one variant per enumerated screen (e.g.
`test-profile-1-inbox_var0`, `test-profile-1-settings_var0`).

## Generating themes

To regenerate or add new theme JSON files for all apps:

```bash
python scripts/generate_themes.py
```

This reads each app's base `theme.json` for the schema, applies 10
color+font palettes (7 light, 3 dark; 5 with spaceGrotesk font, 5 with
sans-serif), and writes them to `.themes/`. Existing files are not
overwritten.

## Previewing themes

To interactively cycle through themes on a connected emulator:

```bash
python scripts/preview_themes.py                     # all apps
python scripts/preview_themes.py --app payment       # single app
python scripts/preview_themes.py --app transit --theme midnight
```

Press Enter to advance, type `q` to quit.

## Adding a new variant dimension

To add a new presentation dimension (e.g. font size, locale):

1. **Create a generation script** following the pattern of
   `create_theme_variants.py`: symlink all shared data, copy/write only
   what differs, call `write_variant_marker()` with a new `variant_type`.

2. **No changes needed** to the compatibility checker or runtime -- the
   `_variant_of.json` marker mechanism is dimension-agnostic.

3. **Populate source files** in a hidden directory under
   `state_data/{bundle_id}/` (e.g. `.locales/`, `.font_configs/`) so
   they are not mistaken for profile directories.

## Implementation details

The shared utilities live in `digiworld/profile_variants.py`:

| Function                  | Purpose                                              |
|---------------------------|------------------------------------------------------|
| `write_variant_marker()`  | Write `_variant_of.json` into a variant directory    |
| `read_variant_marker()`   | Read the marker, returns `None` for base profiles    |
| `is_variant()`            | Check whether a directory has a marker               |
| `list_base_profiles()`    | List non-variant profiles with valid session DBs     |
| `list_variants_of()`      | List all variants deriving from a given base profile |
| `expand_with_variants()`  | Expand base profile names to include their variants  |

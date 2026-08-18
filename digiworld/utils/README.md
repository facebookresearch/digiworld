<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# DigiWorld Utilities

This directory contains utility scripts for managing APKs, emulator setup, and scenario data.

## Scripts Overview

| Script | Purpose |
|--------|---------|
| `setup_emulator.py` | Install APKs and configure emulator environment |
| `cleanup.py` | Clean up state data and regenerate scenario lists |
| `scenario_summary.py` | Generate summaries of available scenarios |
| `generate_tasks_json.py` | Export all tasks to JSONL format |
| `debug_adb_actions.py` | Debug tool for testing ADB state operations |
| `app_config.py` | Shared app configuration (imported by other scripts) |

---

## setup_emulator.py

Sets up Android emulators with mock apps for experiments. Supports multiple emulators in parallel, both Genymotion (cloud) and local ADB devices.

### What it does

1. **For Genymotion emulators:** Enables root access, unlocks screens, and disables SuperUser toast notifications
2. Uninstalls existing apps (ensures fresh install, avoids stale versions)
3. Installs APK files from `current_apps/` directory
4. Opens each app to activate them
5. Runs `set_environment` for each app with a specified profile

The script automatically finds APKs by pattern matching (e.g., `email-*-release.apk`), so it works with versioned filenames. Place the APK files in `current_apps/` before running.

### Quick Start (Recommended)

```bash
cd digiworld/utils

# Install on all emulators defined in emulators.json
python setup_emulator.py --targets-file emulators.json --from-lockfile
```

This command:
- Reads emulator targets from `emulators.json`
- Installs APKs using versions pinned in `apk_versions.json` (lockfile)
- Sets up all emulators in parallel

### Configuration File (emulators.json)

Create an `emulators.json` file to define your emulator targets:

```json
{
  "genymotion": {
    "username": "admin",
    "password": "your-password",
    "ips": [
      "emulatorod-user-abc123-000.emuart.org",
      "emulatorod-user-abc123-001.emuart.org"
    ]
  },
  "adb": {
    "serials": [
      "emulator-5554",
      "emulator-5556"
    ]
  }
}
```

### Usage Examples

```bash
cd digiworld/utils

# Setup from targets file with lockfile versions
python setup_emulator.py --targets-file emulators.json --from-lockfile

# Setup specific Genymotion emulators
python setup_emulator.py --geny-ips emu1.example.org emu2.example.org --geny-user admin --geny-pass pwd

# Setup all connected ADB devices
python setup_emulator.py --all-devices

# Setup specific ADB devices
python setup_emulator.py --device-serials emulator-5554 emulator-5556

# Control parallelism (default: number of targets)
python setup_emulator.py --targets-file emulators.json --parallel 4

# Install specific apps only
python setup_emulator.py --targets-file emulators.json --apps email pay music

# Use specific test profile
python setup_emulator.py --targets-file emulators.json --profile test-profile-2

# Skip root enabling for Genymotion (if already configured)
python setup_emulator.py --targets-file emulators.json --skip-root

# Only uninstall apps (useful for testing or cleanup)
python setup_emulator.py --targets-file emulators.json --uninstall-only

# Skip environment setup (only install and open)
python setup_emulator.py --targets-file emulators.json --skip-env-setup

# Verbose output
python setup_emulator.py --targets-file emulators.json --verbose
```

### Key Options

| Option | Description |
|--------|-------------|
| `--targets-file FILE` | JSON file with emulator targets (recommended) |
| `--from-lockfile` | Use versions from `apk_versions.json` |
| `--parallel N` | Max parallel emulators (default: all) |
| `--skip-root` | Skip root enabling on Genymotion emulators |
| `--geny-ips` | Genymotion emulator IPs (alternative to targets file) |
| `--device-serials` | ADB device serials (alternative to targets file) |
| `--all-devices` | Auto-detect all connected ADB devices |
| `--apps` | Specific apps to install |
| `--profile` | Test profile to use for environment setup |

---

## cleanup.py

Manages scenario data and state files.

### Usage

```bash
cd digiworld/utils

# Regenerate scenario_list.json from registry
python cleanup.py update-scenario-list

# Clean non-default states from all profiles
python cleanup.py clean-states

# Clean states for specific app/profile
python cleanup.py clean-states --bundle-id com.andojomail.sbx --profile test-profile-1

# Dry run (show what would be deleted)
python cleanup.py clean-states --dry-run
```

---

## scenario_summary.py

Generates summaries and statistics of available scenarios.

### Usage

```bash
cd digiworld/utils

# Show summary of all scenarios
python scenario_summary.py

# List all instances for a specific app
python scenario_summary.py --app email

# Show detailed instance information
python scenario_summary.py --detailed
```

---

## generate_tasks_json.py

Exports all tasks from the scenario registry to a JSONL file.

### Usage

```bash
cd digiworld/utils

# Generate tasks_list.jsonl
python generate_tasks_json.py

# Custom output file
python generate_tasks_json.py --output custom_tasks.jsonl
```

---

## debug_adb_actions.py

Interactive debug tool for testing ADB state operations (set_environment, persist_state, rollback_state).

### Usage

```bash
cd digiworld/utils

# Launch interactive debugger
python debug_adb_actions.py
```

---

## app_config.py

Shared configuration module defining app names, APK filenames, bundle IDs, and release tag patterns. Imported by `setup_emulator.py`.

Not meant to be run directly.


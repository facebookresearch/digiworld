# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Pytest configuration and fixtures for integration tests.

This module provides:
- Session-scoped fixtures for backend and app management
- Scenario registry fixture
- Skip conditions based on emulator availability
"""

import sys
import time
import subprocess
import pytest
import logging
from pathlib import Path
from typing import Dict, List, Any

# Add paths to import from the project modules
_REPO_ROOT = Path(__file__).parent.parent.parent
_ADB_API_PATH = _REPO_ROOT / "digiworld"
_DIGIWORLD_PATH = _REPO_ROOT / "digiworld"
_UTILS_PATH = _REPO_ROOT / "digiworld" / "utils"

for path in [_ADB_API_PATH, _DIGIWORLD_PATH, _UTILS_PATH]:
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from digiworld.adb.backends import EmulatorBackend, ADBBackend, GenymotionBackend
from tests.integration.backends import (
    get_backend_from_env,
    is_device_connected,
    get_installed_packages,
    is_package_installed,
    get_test_apps,
    should_skip_install,
    get_project_paths,
    find_apk_for_app,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Pytest Hooks
# =============================================================================

def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "emulator: marks tests as requiring a connected emulator"
    )


# =============================================================================
# Session-Scoped Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def emulator_backend() -> EmulatorBackend:
    """
    Create an emulator backend based on environment configuration.

    Environment variables:
        EMULATOR_BACKEND: 'adb' or 'genymotion' (default: 'adb')
        GENY_IP, GENY_USERNAME, GENY_PASSWORD: Genymotion credentials

    Returns:
        EmulatorBackend: Configured backend instance
    """
    backend = get_backend_from_env()
    logger.info(f"Created emulator backend: {type(backend).__name__}")
    return backend


@pytest.fixture(scope="session")
def require_emulator(emulator_backend: EmulatorBackend):
    """Skip tests if no emulator is connected."""
    if not is_device_connected(emulator_backend):
        pytest.skip("No emulator connected")


@pytest.fixture(scope="session")
def project_paths() -> Dict[str, Path]:
    """Get important project paths."""
    return get_project_paths()


@pytest.fixture(scope="session")
def app_bundle_ids() -> Dict[str, str]:
    """Get mapping of app names to bundle IDs."""
    from app_config import APP_CONFIG
    return {name: config[1] for name, config in APP_CONFIG.items()}


@pytest.fixture(scope="session")
def installed_apps(
    emulator_backend: EmulatorBackend,
    require_emulator,
    app_bundle_ids: Dict[str, str],
    project_paths: Dict[str, Path]
) -> Dict[str, bool]:
    """
    Check which apps are installed on the emulator.

    If EMULATOR_TEST_SKIP_INSTALL is not set, attempts to install missing apps.

    Returns:
        Dict mapping app name -> True if installed
    """
    test_apps = get_test_apps()
    installed = {}

    if should_skip_install():
        # Just check what's installed
        packages = get_installed_packages(emulator_backend)
        for app_name in test_apps:
            bundle_id = app_bundle_ids.get(app_name)
            installed[app_name] = bundle_id in packages if bundle_id else False
        return installed

    # Install missing apps
    for app_name in test_apps:
        bundle_id = app_bundle_ids.get(app_name)
        if not bundle_id:
            installed[app_name] = False
            continue

        if is_package_installed(emulator_backend, bundle_id):
            installed[app_name] = True
            continue

        apk_path = find_apk_for_app(app_name)
        if apk_path and apk_path.exists():
            try:
                result = emulator_backend.install_apk(str(apk_path))
                installed[app_name] = result
            except Exception as e:
                logger.error(f"Error installing {app_name}: {e}")
                installed[app_name] = False
        else:
            installed[app_name] = False

    return installed


@pytest.fixture(scope="session")
def apps_warmed_up(
    emulator_backend: EmulatorBackend,
    require_emulator,
    installed_apps: Dict[str, bool],
    app_bundle_ids: Dict[str, str],
    project_paths: Dict[str, Path],
    request
) -> bool:
    """
    Launch all installed apps to warm them up before tests.

    Also registers a teardown finalizer to clean up generated states.
    """
    logger.info("Warming up all installed apps...")

    installed_bundle_ids = [
        app_bundle_ids[app_name]
        for app_name, is_installed in installed_apps.items()
        if is_installed and app_name in app_bundle_ids
    ]

    for bundle_id in installed_bundle_ids:
        try:
            subprocess.run(
                ["adb", "shell", "monkey", "-p", bundle_id, "-c",
                 "android.intent.category.LAUNCHER", "1"],
                capture_output=True,
                timeout=10
            )
            time.sleep(1)
        except Exception as e:
            logger.warning(f"Failed to launch {bundle_id}: {e}")

    time.sleep(5)
    logger.info("App warmup complete")

    # Register cleanup
    def cleanup_generated_states():
        logger.info("Cleaning up generated states...")
        try:
            from cleanup import clean_non_default_states, clean_db_forge_directories

            state_data_path = project_paths["state_data"]
            adb_api_path = project_paths["adb_api"]
            data_path = adb_api_path / "data"

            deleted_states = clean_non_default_states(state_data_path, dry_run=False)
            logger.info(f"Deleted {deleted_states} non-default state(s)")

            if data_path.exists():
                deleted_db_forge = clean_db_forge_directories(data_path, dry_run=False)
                logger.info(f"Deleted {deleted_db_forge} db-forge directory(ies)")

        except Exception as e:
            logger.warning(f"Cleanup failed: {e}")

    request.addfinalizer(cleanup_generated_states)

    return True


@pytest.fixture(scope="session")
def scenario_registry(apps_warmed_up):
    """
    Get the scenario registry with all registered scenarios.

    Depends on apps_warmed_up to ensure apps are ready before tests.
    """
    from digiworld.scenarios.scenario_registry import scenario_registry
    return scenario_registry

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Integration Test for Transit Runtime Theme Loading

This test verifies that the Transit app can load themes at runtime from device storage.
Transit is currently the only app with this feature implemented.

The test cycles through different theme profiles, each with a different theme.json,
allowing visual verification that theme switching works correctly.

Required infrastructure (Transit has this, other apps do not yet):
- src/utils/themeLoader.ts - Load theme.json from device storage
- src/utils/themeReloader.ts - Hot reload subscription system
- 'load-theme' action in deeplinkHandler.ts
- loadActiveTheme() call in _layout.tsx
- initialThemeConfig prop on ThemeProvider

Run with: pytest tests/integration/test_theme_switching.py -v -s
"""

import sys
import time
import pytest
from pathlib import Path

# Add paths to import from the project modules
_REPO_ROOT = Path(__file__).parent.parent.parent
_ADB_API_PATH = _REPO_ROOT / "digiworld"

if str(_ADB_API_PATH) not in sys.path:
    sys.path.insert(0, str(_ADB_API_PATH))

from digiworld.adb.actions import ADBActions


TRANSIT_BUNDLE_ID = "com.andojotransit.sbx"


class TestTransitThemeSwitching:
    """
    Visual test for Transit runtime theme loading.
    
    This test loads different theme profiles in Transit and allows
    visual verification that themes are correctly applied on the emulator.
    
    Profiles tested:
    - test-profile-1: Transit Dark (dark mode, blue primary)
    - test-profile-2: Transit Default (light mode, orange primary)
    - test-profile-3: Transit Green (light mode, green primary)
    """

    TRANSIT_PROFILES = [
        ("test-profile-1", "Transit Dark", "Dark mode with blue primary (#42A5F5)"),
        ("test-profile-2", "Transit Default", "Light mode with orange primary (#FF9F40)"),
        ("test-profile-3", "Transit Green", "Light mode with green primary (#4CAF50)"),
    ]
    
    OBSERVATION_TIME = 5

    @pytest.fixture(scope="class")
    def adb_actions(self, emulator_backend, require_emulator):
        """Create ADBActions instance for the Transit app."""
        return ADBActions(TRANSIT_BUNDLE_ID)

    def test_transit_theme_switching(
        self,
        adb_actions: ADBActions,
        emulator_backend,
        require_emulator,
    ):
        """
        Cycle through Transit theme profiles to verify theme switching works.
        
        Each profile has a different theme.json that gets pushed to the device.
        The test waits between each profile switch to allow visual observation.
        """
        print("\n" + "=" * 70)
        print("TRANSIT THEME SWITCHING TEST")
        print("=" * 70)
        print(f"\nThis test will cycle through {len(self.TRANSIT_PROFILES)} profiles.")
        print(f"Watch the emulator to verify theme changes.")
        print(f"Wait time between profiles: {self.OBSERVATION_TIME} seconds")
        print("=" * 70)

        for i, (profile_id, theme_name, description) in enumerate(self.TRANSIT_PROFILES, 1):
            print(f"\n[{i}/{len(self.TRANSIT_PROFILES)}] Loading: {theme_name}")
            print(f"    Profile: {profile_id}")
            print(f"    Description: {description}")
            print("-" * 50)

            success = adb_actions.set_environment(profile_id)
            assert success, f"Failed to set environment for {profile_id}"
            
            print(f"    Environment set successfully")
            print(f"    Waiting {self.OBSERVATION_TIME}s for visual observation...")
            time.sleep(self.OBSERVATION_TIME)
            
            print(f"    Done with {theme_name}")

        print("\n" + "=" * 70)
        print("TRANSIT THEME SWITCHING COMPLETE")
        print("=" * 70)
        print("\nAll profiles loaded successfully.")
        print("Verify visually that themes changed as expected:")
        for profile_id, theme_name, description in self.TRANSIT_PROFILES:
            print(f"  - {theme_name}: {description}")
        print("=" * 70)

    @pytest.mark.parametrize(
        "profile_id,theme_name,description",
        [
            pytest.param(p, t, d, id=f"{p}-{t.replace(' ', '_')}")
            for p, t, d in [
                ("test-profile-1", "Transit Dark", "Dark mode with blue primary (#42A5F5)"),
                ("test-profile-2", "Transit Default", "Light mode with orange primary (#FF9F40)"),
                ("test-profile-3", "Transit Green", "Light mode with green primary (#4CAF50)"),
            ]
        ]
    )
    def test_load_individual_theme(
        self,
        profile_id: str,
        theme_name: str,
        description: str,
        adb_actions: ADBActions,
        emulator_backend,
        require_emulator,
    ):
        """Test loading a specific theme profile individually."""
        print(f"\n{'='*50}")
        print(f"Loading: {theme_name}")
        print(f"Profile: {profile_id}")
        print(f"Description: {description}")
        print(f"{'='*50}")

        success = adb_actions.set_environment(profile_id)
        assert success, f"Failed to set environment for {profile_id}"

        print(f"Waiting {self.OBSERVATION_TIME}s for visual observation...")
        time.sleep(self.OBSERVATION_TIME)

        print(f"Theme '{theme_name}' loaded successfully")

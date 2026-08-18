# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Tests for the UI state variant system.

Tests cover:
- State enumeration JSON validity
- StateEnumerator generating rootstores with homeRoute/backRoute
- Profile variant expansion with variant type filtering
"""

import json
import os
import tempfile
import shutil
import unittest
from pathlib import Path

# Add parent to path
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from digiworld.scenarios.state_enumerator import StateEnumerator
from digiworld.app_registry import get_all_app_names
from digiworld.profile_variants import (
    write_variant_marker,
    read_variant_marker,
    is_variant,
    expand_with_variants,
)


class TestStateEnumerationFiles(unittest.TestCase):
    """Test that all state_enumeration.json files are valid."""

    def setUp(self):
        self.base_dir = os.path.join(
            os.path.dirname(__file__), "scenarios"
        )

    def test_all_apps_have_state_enumeration(self):
        """Every registered app should have a state_enumeration.json."""
        for app_name in get_all_app_names():
            path = os.path.join(self.base_dir, app_name, "state_enumeration.json")
            self.assertTrue(
                os.path.exists(path),
                f"Missing state_enumeration.json for {app_name}",
            )

    def test_all_files_have_required_fields(self):
        """Each file should have app_name, apk_name, home_route, routes."""
        for app_name in get_all_app_names():
            path = os.path.join(self.base_dir, app_name, "state_enumeration.json")
            if not os.path.exists(path):
                continue
            with open(path) as f:
                config = json.load(f)
            for field in ("app_name", "apk_name", "home_route", "routes"):
                self.assertIn(
                    field, config, f"{app_name}: missing '{field}'"
                )

    def test_home_route_exists_in_routes(self):
        """home_route should reference an actual route."""
        for app_name in get_all_app_names():
            path = os.path.join(self.base_dir, app_name, "state_enumeration.json")
            if not os.path.exists(path):
                continue
            with open(path) as f:
                config = json.load(f)
            routes = [r["route"] for r in config["routes"]]
            self.assertIn(
                config["home_route"],
                routes,
                f"{app_name}: home_route not in routes",
            )

    def test_non_dynamic_routes_have_back_route(self):
        """Every non-dynamic route should have a back_route field."""
        for app_name in get_all_app_names():
            path = os.path.join(self.base_dir, app_name, "state_enumeration.json")
            if not os.path.exists(path):
                continue
            with open(path) as f:
                config = json.load(f)
            for route in config["routes"]:
                if route.get("dynamic"):
                    continue
                self.assertIn(
                    "back_route",
                    route,
                    f"{app_name}/{route['id']}: missing back_route",
                )

    def test_no_id_patterns_in_static_routes(self):
        """Static routes should not contain [id] patterns."""
        for app_name in get_all_app_names():
            path = os.path.join(self.base_dir, app_name, "state_enumeration.json")
            if not os.path.exists(path):
                continue
            with open(path) as f:
                config = json.load(f)
            for route in config["routes"]:
                if route.get("dynamic"):
                    continue
                self.assertNotIn(
                    "[",
                    route.get("route", ""),
                    f"{app_name}/{route['id']}: static route has [id] pattern",
                )


class TestStateEnumeratorRootstore(unittest.TestCase):
    """Test that StateEnumerator generates rootstores with navigation fields."""

    def test_generate_state_includes_home_and_back_route(self):
        """_generate_state should embed homeRoute and backRoute."""
        # Use a real state_enumeration.json (music is simple with no dynamic routes)
        enumerator = StateEnumerator("music")

        state = enumerator._generate_state(
            route_id="search",
            route="/(app)/search",
            screen_name="Search",
            context={},
            user_data={"currentUser": {"email": "test@test.com"}, "authToken": "tok"},
            variation_index=0,
            home_route="/(app)/home",
            back_route=None,
        )

        rootstore = state["rootstore"]
        self.assertEqual(rootstore["homeRoute"], "/(app)/home")
        self.assertNotIn("backRoute", rootstore)  # None values are not written

    def test_generate_state_includes_back_route_for_stack_screen(self):
        """Stack screens should have backRoute set."""
        enumerator = StateEnumerator("email")

        state = enumerator._generate_state(
            route_id="compose",
            route="/screens/compose/mailcompose",
            screen_name="compose",
            context={},
            user_data={"currentUser": {"email": "t@t.com"}, "authToken": "tok"},
            variation_index=0,
            home_route="/(tabs)/inbox",
            back_route="/(tabs)/inbox",
        )

        rootstore = state["rootstore"]
        self.assertEqual(rootstore["homeRoute"], "/(tabs)/inbox")
        self.assertEqual(rootstore["backRoute"], "/(tabs)/inbox")


class TestProfileVariantExpansion(unittest.TestCase):
    """Test expand_with_variants with variant_types filtering."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        # Create a base profile
        base = os.path.join(self.tmpdir, "default")
        os.makedirs(os.path.join(base, "sessions", "default"))
        Path(os.path.join(base, "sessions", "default", "default.db")).touch()

        # Create a theme variant
        theme_var = os.path.join(self.tmpdir, "default-theme_dark")
        os.makedirs(os.path.join(theme_var, "sessions", "default"))
        Path(os.path.join(theme_var, "sessions", "default", "default.db")).touch()
        write_variant_marker(theme_var, "default", "theme", "dark")

        # Create a UI state variant
        ui_var = os.path.join(self.tmpdir, "default-uistate_contacts")
        os.makedirs(os.path.join(ui_var, "sessions", "default"))
        Path(os.path.join(ui_var, "sessions", "default", "default.db")).touch()
        write_variant_marker(ui_var, "default", "ui_state", "contacts")

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_default_expansion_excludes_ui_state(self):
        """By default, UI state variants should not be expanded."""
        os.environ.pop("DIGIWORLD_INCLUDE_UI_STATE_VARIANTS", None)
        expanded = expand_with_variants(self.tmpdir, ["default"])
        self.assertIn("default", expanded)
        self.assertIn("default-theme_dark", expanded)
        self.assertNotIn("default-uistate_contacts", expanded)

    def test_expansion_with_env_var_includes_ui_state(self):
        """With env var set, UI state variants should be expanded."""
        os.environ["DIGIWORLD_INCLUDE_UI_STATE_VARIANTS"] = "true"
        try:
            expanded = expand_with_variants(self.tmpdir, ["default"])
            self.assertIn("default-uistate_contacts", expanded)
            self.assertIn("default-theme_dark", expanded)
        finally:
            os.environ.pop("DIGIWORLD_INCLUDE_UI_STATE_VARIANTS", None)

    def test_explicit_variant_types_filter(self):
        """Explicit variant_types should filter correctly."""
        expanded = expand_with_variants(
            self.tmpdir, ["default"], variant_types=["theme"]
        )
        self.assertIn("default-theme_dark", expanded)
        self.assertNotIn("default-uistate_contacts", expanded)

        expanded = expand_with_variants(
            self.tmpdir, ["default"], variant_types=["ui_state"]
        )
        self.assertNotIn("default-theme_dark", expanded)
        self.assertIn("default-uistate_contacts", expanded)

    def test_variant_marker_fields(self):
        """Variant markers should have correct fields."""
        marker = read_variant_marker(
            os.path.join(self.tmpdir, "default-uistate_contacts")
        )
        self.assertIsNotNone(marker)
        self.assertEqual(marker["base_profile"], "default")
        self.assertEqual(marker["variant_type"], "ui_state")
        self.assertEqual(marker["variant_detail"], "contacts")


class TestRuntimeResolution(unittest.TestCase):
    """Test the runtime theme/UI-state resolution helpers on Scenario."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        # Create .themes/ with two themes
        themes_dir = os.path.join(self.tmpdir, ".themes")
        os.makedirs(themes_dir)
        Path(os.path.join(themes_dir, "midnight.json")).write_text('{"name":"midnight"}')
        Path(os.path.join(themes_dir, "ocean-blue.json")).write_text('{"name":"ocean-blue"}')

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_resolve_theme_explicit(self):
        """Explicit theme arg should return the path."""
        from digiworld.scenarios.scenario_base import Scenario
        # We can't instantiate Scenario (abstract), so test the static-ish method
        # by calling it on the class with a mock self.
        class FakeScenario:
            apk_name = "test"
        fake = FakeScenario()
        result = Scenario._resolve_theme_override(fake, self.tmpdir, "midnight")
        self.assertIsNotNone(result)
        self.assertTrue(result.endswith("midnight.json"))

    def test_resolve_theme_missing(self):
        """Non-existent theme should return None."""
        from digiworld.scenarios.scenario_base import Scenario
        class FakeScenario:
            apk_name = "test"
        fake = FakeScenario()
        result = Scenario._resolve_theme_override(fake, self.tmpdir, "nonexistent")
        self.assertIsNone(result)

    def test_resolve_theme_none_no_env(self):
        """No explicit theme and no env var should return None."""
        from digiworld.scenarios.scenario_base import Scenario
        os.environ.pop("DIGIWORLD_RANDOMIZE_THEME", None)
        class FakeScenario:
            apk_name = "test"
        fake = FakeScenario()
        result = Scenario._resolve_theme_override(fake, self.tmpdir, None)
        self.assertIsNone(result)

    def test_resolve_theme_randomize(self):
        """DIGIWORLD_RANDOMIZE_THEME=true should pick a random theme."""
        from digiworld.scenarios.scenario_base import Scenario
        os.environ["DIGIWORLD_RANDOMIZE_THEME"] = "true"
        try:
            class FakeScenario:
                apk_name = "test"
            fake = FakeScenario()
            result = Scenario._resolve_theme_override(fake, self.tmpdir, None)
            self.assertIsNotNone(result)
            self.assertTrue(result.endswith(".json"))
        finally:
            os.environ.pop("DIGIWORLD_RANDOMIZE_THEME", None)


if __name__ == "__main__":
    unittest.main()

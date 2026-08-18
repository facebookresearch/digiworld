# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for the retry behaviour on the reset path.

Rapid back-to-back resets fail when the app is not up yet by the time the
first deeplink reaches it. Two things guard against that: the pull off the
device is bounded so it cannot eat the caller's whole budget, and the reset
itself is retried behind a relaunch. Neither needs an emulator to test.
"""

import time
import unittest
from unittest import mock

from digiworld.adb.actions import ADBActions, PULL_TIMEOUT_SECONDS
from digiworld.scenarios.scenario_base import Scenario


class _StubBackend:
    """Backend whose file never shows up, i.e. the app never wrote it."""

    def __init__(self):
        self.file_exists_calls = 0

    def file_exists(self, remote_path):
        self.file_exists_calls += 1
        return False


class TestPullBudget(unittest.TestCase):
    """``_pull_with_retries`` must respect its wall-clock budget."""

    def setUp(self):
        self.adb = ADBActions.__new__(ADBActions)
        self.adb.backend = _StubBackend()

    def test_gives_up_within_budget(self):
        started = time.monotonic()
        with self.assertRaises(Exception):
            self.adb._pull_with_retries(
                remote_path="/remote/current.db",
                local_path="/tmp/digiworld-test/current.db",
                description="database",
                max_wait_seconds=4,
            )
        elapsed = time.monotonic() - started
        # Comfortably under the ~120s the unbounded attempt count would cost.
        self.assertLess(elapsed, 8, f"budget overrun: {elapsed:.1f}s")

    def test_error_names_the_file_and_the_budget(self):
        with self.assertRaises(Exception) as ctx:
            self.adb._pull_with_retries(
                remote_path="/remote/current.db",
                local_path="/tmp/digiworld-test/current.db",
                description="database",
                max_wait_seconds=1,
            )
        message = str(ctx.exception)
        self.assertIn("Failed to pull database", message)
        self.assertIn("budget", message)

    def test_attempt_cap_still_applies(self):
        """A generous budget must not defeat max_retries."""
        with self.assertRaises(Exception):
            self.adb._pull_with_retries(
                remote_path="/remote/current.db",
                local_path="/tmp/digiworld-test/current.db",
                description="database",
                max_retries=2,
                max_wait_seconds=600,
            )
        self.assertEqual(self.adb.backend.file_exists_calls, 2)

    def test_default_budget_is_bounded(self):
        self.assertGreater(PULL_TIMEOUT_SECONDS, 0)
        self.assertLessEqual(PULL_TIMEOUT_SECONDS, 120)


class TestAssetSync(unittest.TestCase):
    """``_sync_app_assets`` keeps device images matched to the profile."""

    def test_pushes_the_selected_profile(self):
        adb = mock.Mock()
        adb.push_app_assets.return_value = True
        with mock.patch.dict("os.environ", {}, clear=False):
            Scenario._sync_app_assets(adb, "premium_menu")
        adb.push_app_assets.assert_called_once_with(data_id="premium_menu")

    def test_opt_out_skips_the_push(self):
        adb = mock.Mock()
        with mock.patch.dict("os.environ", {"DIGIWORLD_SKIP_ASSET_SYNC": "true"}):
            Scenario._sync_app_assets(adb, "default")
        adb.push_app_assets.assert_not_called()

    def test_failure_does_not_abort_the_reset(self):
        """Wrong images degrade a task; raising would lose it entirely."""
        adb = mock.Mock()
        adb.push_app_assets.side_effect = RuntimeError("adb push died")
        Scenario._sync_app_assets(adb, "default")  # must not raise

    def test_falsy_return_does_not_abort_the_reset(self):
        adb = mock.Mock()
        adb.push_app_assets.return_value = False
        Scenario._sync_app_assets(adb, "default")  # must not raise


if __name__ == "__main__":
    unittest.main()

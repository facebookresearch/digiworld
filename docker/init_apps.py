# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Load the default profile into every DigiWorld app on the running emulator.

Launching an app is not enough to make it usable by a scenario: the app's
in-memory state (deeplink handlers, session and user stores) is only wired up
once a profile has been pushed and applied. Doing that here -- before the
snapshot is baked -- means a scenario reset at evaluation time only has to swap
the data, instead of initialising the app from scratch.

An app that is not initialised here fails to reset at evaluation time, taking
every one of its tasks with it, so this exits non-zero if any app is left
uninitialised after a retry.
"""

import logging
import os
import random
import subprocess
import sys
import time

sys.path.insert(0, "/app/digiworld")

import digiworld
from digiworld.adb.actions import ADBActions
from digiworld.adb.backends import ADBBackend
from digiworld.app_registry import get_apk_key, get_app_to_bundle_mapping
from digiworld.profile_variants import list_base_profiles

STATE_DATA_PATH = "/app/digiworld/digiworld/state_data"
PROFILE = "default"
# Set to "true" to initialise each app with a randomly chosen profile instead
# of "default". Only affects the baked snapshot's starting state -- a
# scenario reset at evaluation time pushes whatever profile the task needs
# regardless, so this is for manual/exploratory container use, not eval.
RANDOM_PROFILES = os.environ.get("INIT_APPS_RANDOM_PROFILES", "").lower() == "true"
RANDOM_PROFILE_SEED = os.environ.get("INIT_APPS_RANDOM_SEED")
# Comma-separated app_registry keys (e.g. "shop,eats") to limit which apps
# get (re)initialised. Unset/empty means all apps.
ONLY_APPS = {
    name.strip() for name in os.environ.get("INIT_APPS_ONLY", "").split(",") if name.strip()
}
# Explicit profile name to use for every selected app (e.g. "high_ride_volume").
# Takes precedence over RANDOM_PROFILES. Falls back to PROFILE if the app has
# no such profile directory.
EXPLICIT_PROFILE = os.environ.get("INIT_APPS_PROFILE")
ATTEMPTS = 2
LAUNCH_SETTLE_SECONDS = 6
SETTLE_SECONDS = 2

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("init_apps")


def _adb(*args: str) -> None:
    subprocess.run(["adb", *args], capture_output=True, timeout=60)


def _installed_version(bundle_id: str) -> str:
    result = subprocess.run(
        ["adb", "shell", f"dumpsys package {bundle_id} | grep versionName"],
        capture_output=True, text=True, timeout=60,
    )
    for line in result.stdout.splitlines():
        if "versionName=" in line:
            return line.split("versionName=")[1].strip()
    return ""


def check_apk_versions(bundles: dict) -> list:
    """Compare the installed APKs against apk_versions.json.

    A scenario reset refuses to run against an app older than the lockfile
    requires, so an out-of-date APK silently costs every one of that app's
    tasks. Reporting it here means it surfaces at build time instead.
    """
    try:
        from packaging.version import InvalidVersion, Version

        minimums = digiworld.get_apk_versions()
    except Exception:
        logger.warning("Could not load apk_versions.json; skipping the version check")
        return []

    outdated = []
    for app_name, bundle_id in bundles.items():
        apk_key = get_apk_key(app_name)
        required = minimums.get(apk_key) if apk_key else None
        if not required:
            continue
        installed = _installed_version(bundle_id)
        if not installed:
            logger.warning("[%s] could not read the installed version of %s", app_name, bundle_id)
            continue
        try:
            if Version(installed) < Version(required):
                outdated.append((app_name, installed, required))
        except InvalidVersion:
            logger.warning("[%s] unparseable version %r", app_name, installed)
    return outdated


def _pick_profile(bundle_id: str) -> str:
    """Choose the profile to initialise *bundle_id* with.

    EXPLICIT_PROFILE wins if set and the app has that profile directory.
    Otherwise a random profile is picked if RANDOM_PROFILES is set.
    Falls back to PROFILE ("default") in all other cases.
    """
    app_dir = os.path.join(STATE_DATA_PATH, bundle_id)
    try:
        # Only real, restorable profiles: a bare listdir also returns the
        # `.ui_states`/`.themes` overlay directories and any session-less
        # scratch profile, none of which set_environment can restore -- picking
        # one leaves the app uninitialised and fails the build.
        profiles = list_base_profiles(app_dir)
    except OSError:
        profiles = []

    if EXPLICIT_PROFILE:
        if EXPLICIT_PROFILE in profiles:
            return EXPLICIT_PROFILE
        logger.warning(
            "[%s] no profile '%s' under %s; using '%s'",
            bundle_id, EXPLICIT_PROFILE, app_dir, PROFILE,
        )
        return PROFILE

    if not RANDOM_PROFILES:
        return PROFILE

    if not profiles:
        logger.warning("[%s] no profiles found under %s; using '%s'", bundle_id, app_dir, PROFILE)
        return PROFILE
    return random.choice(profiles)


def _restart_app(bundle_id: str) -> None:
    """Bring the app up in the foreground from a clean process state.

    `set_environment` pushes data and then polls the app for readiness, which
    only ever succeeds while the app is actually running.
    """
    _adb("shell", "am", "force-stop", bundle_id)
    time.sleep(1)
    _adb("shell", "monkey", "-p", bundle_id, "-c", "android.intent.category.LAUNCHER", "1")
    time.sleep(LAUNCH_SETTLE_SECONDS)


def main() -> int:
    if RANDOM_PROFILES and RANDOM_PROFILE_SEED is not None:
        random.seed(RANDOM_PROFILE_SEED)

    backend = ADBBackend()
    bundles = get_app_to_bundle_mapping()

    if ONLY_APPS:
        unknown = ONLY_APPS - bundles.keys()
        if unknown:
            logger.error("Unknown app(s) in INIT_APPS_ONLY: %s", ", ".join(sorted(unknown)))
            return 1
        bundles = {name: bundle_id for name, bundle_id in bundles.items() if name in ONLY_APPS}

    outdated = check_apk_versions(bundles)
    if outdated:
        logger.warning("=" * 72)
        for app_name, installed, required in outdated:
            logger.warning(
                "APK OUT OF DATE: %s %s is installed but digiworld/apk_versions.json "
                "requires >= %s -- every %s task will fail to reset.",
                app_name, installed, required, app_name,
            )
        logger.warning(
            "Replace the affected APKs in digiworld/current_apps/ and rebuild."
        )
        logger.warning("=" * 72)

    if EXPLICIT_PROFILE:
        logger.info("Initialising %d apps with profile '%s'", len(bundles), EXPLICIT_PROFILE)
    elif RANDOM_PROFILES:
        logger.info("Initialising %d apps with a random profile each", len(bundles))
    else:
        logger.info("Initialising %d apps with profile '%s'", len(bundles), PROFILE)

    failed = []
    for app_name, bundle_id in bundles.items():
        profile = _pick_profile(bundle_id)
        adb = ADBActions(
            bundle_id=bundle_id,
            custom_path=STATE_DATA_PATH,
            backend=backend,
        )

        try:
            adb.push_app_assets(data_id=profile)
        except Exception:
            logger.exception("[%s] push_app_assets raised for profile '%s'", app_name, profile)

        ok = False
        for attempt in range(1, ATTEMPTS + 1):
            _restart_app(bundle_id)
            try:
                ok = adb.set_environment(data_id=profile, wait_for_ready=True)
            except Exception:
                logger.exception("[%s] set_environment raised (attempt %d)", app_name, attempt)
                ok = False
            if ok:
                adb.wait_for_ready()
                logger.info("[%s] %s initialised with profile '%s'", app_name, bundle_id, profile)
                break
            logger.warning(
                "[%s] %s did not initialise with profile '%s' (attempt %d/%d)",
                app_name, bundle_id, profile, attempt, ATTEMPTS,
            )

        if not ok:
            failed.append(app_name)
        time.sleep(SETTLE_SECONDS)

    logger.info("App initialisation done (%d/%d ok)", len(bundles) - len(failed), len(bundles))
    if failed:
        logger.error(
            "%d app(s) could not be initialised: %s. Their tasks would fail to reset, "
            "so the image is not usable as-is.",
            len(failed), ", ".join(failed),
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

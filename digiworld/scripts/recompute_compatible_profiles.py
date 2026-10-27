#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Recompute ``compatible_profiles`` for every instance from its scenario's
feasibility constraints, against the profile databases in ``state_data``.

Each scenario's ``feasibility.py`` declares ``CONSTRAINTS``; an instance is
compatible with a profile when every constraint holds on that profile's session
DB for the instance's parameters (``ProfileCompatibilityChecker``). Run this
after the profile data changes so instances are only offered on profiles where
they can be carried out.

With ``--after-injection`` the constraints are evaluated on the state the
instance actually starts from: the profile DB with the instance's mockdata
appended by the same data-append step a reset runs (templates resolved by the
scenario's MockdataHandler, merged by DatabaseValidator.execute_data_append).
A pair whose injection fails is incompatible too. Without it, constraints see
the bare profile DB, which misses rows the instance itself injects.

Only the ``compatible_profiles`` array of each ``instance_config.json`` is
rewritten; the rest of the file is left byte-for-byte as it was.

Usage:
  python digiworld/scripts/recompute_compatible_profiles.py --check     # report only
  python digiworld/scripts/recompute_compatible_profiles.py --write
  python digiworld/scripts/recompute_compatible_profiles.py --write --app banking --scenario pay_bill_with_credit_card
Exit status 1 with --check when any instance would change or has no compatible profile.
"""
from __future__ import annotations

import argparse
import contextlib
import importlib
import io
import json
import logging
import os
import re
import shutil
import sqlite3
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]           # .../digiworld (python project)
sys.path.insert(0, str(ROOT))

from digiworld.scenarios.profile_compatibility import ProfileCompatibilityChecker  # noqa: E402

PKG = ROOT / "digiworld"
SCENARIOS = PKG / "scenarios" / "scenarios"
_COMPAT_RE = re.compile(r'("compatible_profiles"\s*:\s*)\[[^\]]*\]', re.S)


def load_constraints(app: str, scenario: str):
    if not (SCENARIOS / app / scenario / "feasibility.py").exists():
        return None
    mod = importlib.import_module(f"digiworld.scenarios.scenarios.{app}.{scenario}.feasibility")
    return list(getattr(mod, "CONSTRAINTS", []) or [])


class _NullBackend:
    def push_file(self, *a, **k):
        return True

    def execute_command(self, *a, **k):
        return ""


_APP_CONFIG = None


def injected_db(app: str, scenario: str, instance: str, profile: str, work: Path) -> Path:
    """The instance's start DB on ``profile``: the profile DB plus the instance's
    resolved mockdata, appended as a reset does. Raises if the injection fails."""
    global _APP_CONFIG
    from types import SimpleNamespace
    from digiworld.app_registry import APP_REGISTRY
    from digiworld.adb.actions import ADBActions
    from digiworld.adb.validator import DatabaseValidator
    if _APP_CONFIG is None:
        _APP_CONFIG = ADBActions._build_app_config()
    bundle = APP_REGISTRY[app]["bundle_id"]
    prof_dir = PKG / "state_data" / bundle / profile
    if work.exists():
        shutil.rmtree(work)
    (work / "source").mkdir(parents=True)
    cur_db = work / "current.db"
    shutil.copy2(prof_dir / "sessions" / "default" / "default.db", cur_db)
    # the device pull a reset works from: current.db + current.json (the rootstore,
    # which template resolution reads the current user from)
    shutil.copy2(prof_dir / "sessions" / "default" / "rootstore.json", work / "current.json")
    cfg = json.loads((SCENARIOS / app / scenario / "scenario_config.json").read_text())
    with contextlib.redirect_stdout(io.StringIO()):
        mod = importlib.import_module(f"digiworld.scenarios.scenarios.{app}.{scenario}.scenario")
        sc = getattr(mod, cfg["scenario_class"])(base_path=str(PKG / "state_data"), instance_tag=instance)
        if not getattr(sc, "additional_mockdata", False):
            return cur_db
        sc.apk_name = bundle
        sc.profile_name = profile
        sc.initial_state_path = str(prof_dir / "sessions" / "default")
        sc.initial_state_id = "default"
        adb = SimpleNamespace(bundle_id=bundle, appConfig=_APP_CONFIG, backend=_NullBackend(),
                              device_base_path=f"/storage/emulated/0/Android/data/{bundle}/files",
                              script_dir=str(work), backup_dir=str(PKG / "state_data" / bundle),
                              current_data_id=profile)
        resolved = sc._mockdata_handler._resolve_templates_in_mockdata(adb, str(cur_db))
        if not resolved:
            return cur_db
        for fn, data in resolved.items():
            (work / "source" / fn).write_text(json.dumps(data))
        merged = work / "merged.db"
        ok = DatabaseValidator(bundle, _APP_CONFIG.get(bundle, {})).execute_data_append(
            str(cur_db), str(merged), str(work / "source"))
    if not ok:
        raise RuntimeError("data append failed")
    return merged


def _feasible_after_injection(job):
    app, scenario, instance, profiles, params = job
    logging.disable(logging.CRITICAL)
    constraints = load_constraints(app, scenario) or []    # none: injection check only
    out = []
    work = Path(tempfile.mkdtemp(prefix="compat_"))
    try:
        for prof in profiles:
            try:
                db = injected_db(app, scenario, instance, prof, work / "w")
            except Exception:
                continue                       # the reset itself would fail here
            if ProfileCompatibilityChecker._evaluate_all(db, constraints, params):
                out.append(prof)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return out


def render(raw: str, profiles: list[str]) -> str:
    """Replace the compatible_profiles array, keeping the file's own layout."""
    m = _COMPAT_RE.search(raw)
    if not m:
        raise ValueError("no compatible_profiles key")
    line_start = raw.rfind("\n", 0, m.start()) + 1
    indent = re.match(r"[ \t]*", raw[line_start:]).group(0)
    one_line = "\n" not in m.group(0)
    if one_line or not profiles:
        body = "[" + ", ".join(json.dumps(p, ensure_ascii=False) for p in profiles) + "]"
    else:
        step = "  " if "  " in indent or not indent else indent
        inner = indent + step
        body = "[\n" + ",\n".join(inner + json.dumps(p, ensure_ascii=False) for p in profiles) + "\n" + indent + "]"
    return raw[:m.start()] + m.group(1) + body + raw[m.end():]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    ap.add_argument("--app")
    ap.add_argument("--scenario")
    ap.add_argument("--only-remove", action="store_true",
                    help="never add a profile that is not already listed (intersection); an "
                         "instance left with none is then offered every feasible profile")
    ap.add_argument("--report", type=Path, help="write a JSON report of every change here")
    ap.add_argument("--after-injection", action="store_true",
                    help="evaluate constraints on the profile DB with the instance's mockdata appended")
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 2))
    args = ap.parse_args(argv)

    checker = ProfileCompatibilityChecker(PKG / "state_data")
    from digiworld.app_registry import APP_REGISTRY
    items, no_feas = [], 0
    for app_dir in sorted(p for p in SCENARIOS.iterdir() if p.is_dir() and not p.name.startswith("_")):
        if args.app and app_dir.name != args.app:
            continue
        for scen_dir in sorted(p for p in app_dir.iterdir() if (p / "scenario_config.json").exists()):
            if args.scenario and scen_dir.name != args.scenario:
                continue
            constraints = load_constraints(app_dir.name, scen_dir.name)
            if constraints is None:
                no_feas += 1
                if not args.after_injection:
                    continue
                constraints = []          # still drop pairs whose injection fails
            inst_root = scen_dir / "instances"
            if not inst_root.is_dir():
                continue
            for inst in sorted(p for p in inst_root.iterdir() if (p / "instance_config.json").exists()):
                items.append((app_dir.name, scen_dir.name, inst, constraints))

    def candidates(app, cfg):
        old = list(cfg.get("compatible_profiles") or [])
        if args.only_remove and old:
            return old
        return checker._list_profiles(PKG / "state_data" / APP_REGISTRY[app]["bundle_id"])

    # An instance without a compatible_profiles list falls back to its scenario's
    # list; leave those alone.
    items = [it for it in items
             if json.loads((it[2] / "instance_config.json").read_text(encoding="utf-8")).get("compatible_profiles")]

    results = {}
    if args.after_injection:
        jobs = []
        for app, scen, inst, _ in items:
            cfg = json.loads((inst / "instance_config.json").read_text(encoding="utf-8"))
            jobs.append((app, scen, inst.name, candidates(app, cfg), cfg.get("parameters") or {}))
        with ProcessPoolExecutor(max_workers=args.jobs) as ex:
            for job, res in zip(jobs, ex.map(_feasible_after_injection, jobs, chunksize=4)):
                results[(job[0], job[1], job[2])] = res
            if args.only_remove:
                # nothing listed is feasible: fall back to every feasible profile
                retry = [(a, sc, i, checker._list_profiles(PKG / "state_data" / APP_REGISTRY[a]["bundle_id"]), prm)
                         for (a, sc, i, _, prm) in jobs if not results[(a, sc, i)]]
                for job, res in zip(retry, ex.map(_feasible_after_injection, retry)):
                    results[(job[0], job[1], job[2])] = res

    changed, empty, unchanged = [], [], 0
    for app, scen, inst, constraints in items:
        path = inst / "instance_config.json"
        raw = path.read_text(encoding="utf-8")
        cfg = json.loads(raw)
        old = list(cfg.get("compatible_profiles") or [])
        if args.after_injection:
            new = results[(app, scen, inst.name)]
        else:
            new = [p for p in candidates(app, cfg)
                   if checker._evaluate_all(PKG / "state_data" / APP_REGISTRY[app]["bundle_id"] / p
                                            / "sessions" / "default" / "default.db",
                                            constraints, cfg.get("parameters") or {})]
        rec = {"app": app, "scenario": scen, "instance": inst.name,
               "removed": [p for p in old if p not in new], "added": [p for p in new if p not in old]}
        if not new:
            empty.append(rec)
            continue                      # left as is: needs a new parameter value
        if new == old:
            unchanged += 1
            continue
        changed.append(rec)
        if args.write:
            path.write_text(render(raw, new), encoding="utf-8")
    print(f"instances: {unchanged} unchanged, {len(changed)} changed, {len(empty)} with no compatible profile; "
          f"{no_feas} scenarios without feasibility.py")
    print(f"pairs removed: {sum(len(r['removed']) for r in changed)}, added: {sum(len(r['added']) for r in changed)}")
    for r in empty[:40]:
        print(f"  no compatible profile: {r['app']}/{r['scenario']}/{r['instance']}")
    if args.report:
        args.report.write_text(json.dumps({"changed": changed, "empty": empty}, indent=1, ensure_ascii=False))
    return 1 if args.check and (changed or empty) else 0


if __name__ == "__main__":
    sys.exit(main())

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Fail CI only on pytest failures that are not in the committed baseline.

The test suite has failures that predate the check-python job (mostly
instance-integrity findings in the scenario data). They are listed, one test id
per line, in .github/pytest-baseline.txt. This script reads the JUnit XML that
pytest wrote and:

* fails when a test fails that is not in the baseline;
* accepts a new failing id of a parametrized test only in exchange for a
  baseline id of the same test that no longer fails (an instance folder that was
  renamed gives its tests new ids), so per test function the number of failures
  can only stay the same or go down;
* lists baseline ids that now pass, so the baseline can be shrunk with --update;
* fails when pytest did not run (no JUnit file, no tests, or an exit status
  other than 0 or 1).

Usage:
  python .github/scripts/check_pytest_baseline.py pytest-results.xml --exit-code $rc
  python .github/scripts/check_pytest_baseline.py pytest-results.xml --update
"""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

DEFAULT_BASELINE = Path(__file__).resolve().parents[1] / "pytest-baseline.txt"
HEADER = (
    "# Pytest failures that predate the check-python job, one test id per line.\n"
    "# CI fails only on failures not listed here; see .github/scripts/check_pytest_baseline.py.\n"
    "# Regenerate after fixing tests: python .github/scripts/check_pytest_baseline.py "
    "pytest-results.xml --update\n"
)


def read_results(path: Path) -> tuple[int, set[str]]:
    """(number of test cases, ids of the failed or errored ones) from a JUnit file."""
    root = ET.parse(path).getroot()
    total, failed = 0, set()
    for case in root.iter("testcase"):
        total += 1
        if case.find("failure") is not None or case.find("error") is not None:
            failed.add(f"{case.get('classname', '')}::{case.get('name', '')}")
    return total, failed


def read_baseline(path: Path) -> set[str]:
    if not path.exists():
        return set()
    lines = path.read_text(encoding="utf-8").splitlines()
    return {line for line in lines if line and not line.startswith("#")}


def base_id(test_id: str) -> str:
    """The test function a (possibly parametrized) test id belongs to."""
    return re.sub(r"\[.*\]$", "", test_id)


def compare(failed: set[str], baseline: set[str]):
    """(new failures, ids accepted as renamed, baseline ids that no longer fail)."""
    fixed = baseline - failed
    fixed_per_test = defaultdict(int)
    for test_id in fixed:
        fixed_per_test[base_id(test_id)] += 1
    new_per_test = defaultdict(list)
    for test_id in sorted(failed - baseline):
        new_per_test[base_id(test_id)].append(test_id)
    new, accepted = [], []
    for test, ids in new_per_test.items():
        if len(ids) <= fixed_per_test[test]:
            accepted.extend(ids)
        else:
            new.extend(ids)
    return sorted(new), sorted(accepted), sorted(fixed)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("junit", type=Path)
    ap.add_argument("--baseline", type=Path, default=DEFAULT_BASELINE)
    ap.add_argument("--exit-code", type=int, default=None, help="pytest's exit status")
    ap.add_argument(
        "--update",
        action="store_true",
        help="write the current failures as the baseline",
    )
    args = ap.parse_args(argv)

    if args.exit_code not in (None, 0, 1):
        print(f"pytest did not complete (exit status {args.exit_code}).")
        return 1
    if not args.junit.exists():
        print(f"No JUnit results at {args.junit}: pytest did not run.")
        return 1
    total, failed = read_results(args.junit)
    if total == 0:
        print("pytest ran no tests.")
        return 1

    if args.update:
        args.baseline.write_text(
            HEADER + "".join(f"{t}\n" for t in sorted(failed)), encoding="utf-8"
        )
        print(f"Wrote {len(failed)} failing test ids to {args.baseline}.")
        return 0

    baseline = read_baseline(args.baseline)
    new, accepted, fixed = compare(failed, baseline)
    print(
        f"{total} tests, {len(failed)} failed or errored; baseline lists {len(baseline)}."
    )
    if accepted:
        print(
            f"{len(accepted)} new ids of parametrized tests accepted in place of baseline ids of "
            "the same test that no longer fail (e.g. renamed instances):"
        )
        for test_id in accepted:
            print(f"  ~ {test_id}")
    if fixed:
        print(
            f"{len(fixed)} baseline ids no longer fail; shrink the baseline with --update."
        )
    if new:
        print(f"{len(new)} new failures (not in {args.baseline.name}):")
        for test_id in new:
            print(f"  + {test_id}")
        return 1
    print("No new failures.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

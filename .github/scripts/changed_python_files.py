# Copyright (c) Meta Platforms, Inc. and affiliates.
"""List the Python files the check-python job formats and lints.

Most of the existing code predates the formatting checks, so the job checks
only the Python files a PR touches, and of those:

* every file the PR adds (or copies);
* every file it changes or renames that was already clean before the PR, i.e.
  whose version at the merge base passes black, isort and flake8. A PR must not
  break a clean file, but it is not asked to fix formatting it did not cause.

Usage: python .github/scripts/changed_python_files.py origin/main > files.txt
"""

from __future__ import annotations

import subprocess
import sys


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], check=True, capture_output=True, text=True
    ).stdout


def clean_at(rev: str, path: str) -> bool:
    """Whether the file at `rev` passes black, isort and flake8."""
    source = git("show", f"{rev}:{path}")
    checks = [
        ["black", "--check", "--quiet", "--stdin-filename", path, "-"],
        ["isort", "--check-only", "--quiet", "--filename", path, "-"],
        ["flake8", "--stdin-display-name", path, "-"],
    ]
    for cmd in checks:
        if (
            subprocess.run(cmd, input=source, capture_output=True, text=True).returncode
            != 0
        ):
            return False
    return True


def main(argv: list[str]) -> int:
    base = git("merge-base", argv[1], "HEAD").strip()
    out = []
    for line in git(
        "diff", "--name-status", "-M", "--diff-filter=ACMR", base, "HEAD", "--", "*.py"
    ).splitlines():
        parts = line.split("\t")
        status, path = parts[0], parts[-1]
        if status[0] in "AC":
            out.append(path)
        elif clean_at(base, parts[1]):  # M or R: the path before the PR
            out.append(path)
        else:
            print(f"skipped (not clean before this PR): {path}", file=sys.stderr)
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

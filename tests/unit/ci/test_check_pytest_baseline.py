# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for .github/scripts/check_pytest_baseline.py."""

import importlib.util
from pathlib import Path

SCRIPT = (
    Path(__file__).resolve().parents[3]
    / ".github"
    / "scripts"
    / "check_pytest_baseline.py"
)
spec = importlib.util.spec_from_file_location("check_pytest_baseline", SCRIPT)
cpb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cpb)


def _junit(tmp_path, cases):
    body = "".join(
        f'<testcase classname="{cls}" name="{name}">{"<failure/>" if failed else ""}</testcase>'
        for cls, name, failed in cases
    )
    path = tmp_path / "results.xml"
    path.write_text(f"<testsuites><testsuite>{body}</testsuite></testsuites>")
    return path


def _baseline(tmp_path, ids):
    path = tmp_path / "baseline.txt"
    path.write_text("# header\n" + "".join(f"{i}\n" for i in ids))
    return path


def test_known_failures_pass(tmp_path):
    junit = _junit(tmp_path, [("t.A", "test_x", True), ("t.A", "test_y", False)])
    assert (
        cpb.main(
            [
                str(junit),
                "--baseline",
                str(_baseline(tmp_path, ["t.A::test_x"])),
                "--exit-code",
                "1",
            ]
        )
        == 0
    )


def test_new_failure_fails(tmp_path):
    junit = _junit(tmp_path, [("t.A", "test_x", True), ("t.A", "test_y", True)])
    assert (
        cpb.main(
            [
                str(junit),
                "--baseline",
                str(_baseline(tmp_path, ["t.A::test_x"])),
                "--exit-code",
                "1",
            ]
        )
        == 1
    )


def test_renamed_parameter_is_accepted_in_place_of_one_that_no_longer_fails(tmp_path):
    junit = _junit(tmp_path, [("t.A", "test_p[new_name]", True)])
    baseline = _baseline(tmp_path, ["t.A::test_p[old_name]"])
    assert cpb.main([str(junit), "--baseline", str(baseline), "--exit-code", "1"]) == 0


def test_more_failures_of_a_parametrized_test_fail(tmp_path):
    junit = _junit(tmp_path, [("t.A", "test_p[a]", True), ("t.A", "test_p[b]", True)])
    baseline = _baseline(tmp_path, ["t.A::test_p[a]", "t.A::test_q"])
    assert cpb.main([str(junit), "--baseline", str(baseline), "--exit-code", "1"]) == 1


def test_pytest_that_did_not_complete_fails(tmp_path):
    junit = _junit(tmp_path, [("t.A", "test_x", False)])
    assert (
        cpb.main(
            [str(junit), "--baseline", str(_baseline(tmp_path, [])), "--exit-code", "2"]
        )
        == 1
    )
    assert (
        cpb.main(
            [str(tmp_path / "missing.xml"), "--baseline", str(_baseline(tmp_path, []))]
        )
        == 1
    )


def test_update_writes_the_current_failures(tmp_path):
    junit = _junit(tmp_path, [("t.A", "test_x", True), ("t.A", "test_y", False)])
    baseline = tmp_path / "out.txt"
    assert cpb.main([str(junit), "--baseline", str(baseline), "--update"]) == 0
    assert cpb.read_baseline(baseline) == {"t.A::test_x"}

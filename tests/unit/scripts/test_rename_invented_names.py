# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for digiworld/scripts/rename_invented_names.py."""

import importlib.util
import sys
from collections import Counter
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[3] / "digiworld" / "scripts"


def _load():
    sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location(
        "rename_invented_names", SCRIPTS / "rename_invented_names.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rin = _load()


def test_a_name_the_anonymisation_put_in_is_a_stand_in():
    # base text had the brand, current text has the earlier invented name
    assert rin.verdicts(
        "2024 Electra EY Long-Range Review", "2024 Tesla Model Y Long-Range Review"
    ) == ("derived", "derived")


def test_a_name_that_was_already_there_stays():
    assert rin.verdicts("Harmony Music School", "Harmony Music School") == ("kept",)
    # same string, one stand-in and one pre-existing use
    assert rin.verdicts(
        "Harmony Civix at Harmony Music School", "Honda Civic at Harmony Music School"
    ) == ("derived", "derived", "kept")


class _Fixed:
    """A decision table standing in for Decisions (no base tree needed)."""

    def __init__(self, table):
        self.table = table

    def __call__(self, key, s):
        return self.table.get((key, s), tuple("kept" for _ in rin.occurrences(s)))


def test_rename_follows_the_field_decision():
    decide = _Fixed({("make", "Electra"): ("derived",)})
    counts = Counter()
    assert rin.rename("Electra", "make", decide, counts) == "Voltaine"
    assert (
        rin.rename("Electra", "nickname", decide, counts) == "Electra"
    )  # a car's nickname, not the make
    raw = '{"make": "Electra", "nickname": "Electra"}'
    assert (
        rin.fix_json_text(raw, decide, counts)
        == '{"make": "Voltaine", "nickname": "Electra"}'
    )


def test_a_re_pointed_value_is_not_a_stand_in():
    # the instance now names another (pre-existing) artist; the base had a different one, not a brand
    assert rin.verdicts("Zara Lumen", "Celtic Tide", preexisting=True) == ("kept",)
    # a make that replaced a brand still counts, even if the same word exists elsewhere
    assert rin.verdicts("Electra", "Tesla", preexisting=True) == ("derived",)

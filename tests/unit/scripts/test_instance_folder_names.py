# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Instance folder names follow their data: a folder name must not spell a name
the brand tools replaced in that instance's data (also as the cut-off end of a
folder name, e.g. "..._led_zeppe_1")."""

import importlib.util
import json
import os
import re
import sys
import unicodedata
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / "digiworld" / "scripts"
SCENARIOS = Path(
    os.environ.get(
        "FOLDER_NAMES_SCENARIOS",
        ROOT / "digiworld" / "digiworld" / "scenarios" / "scenarios",
    )
)


def _load(name):
    sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def slug(text: str) -> str:
    text = (
        unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    )
    return re.sub(
        r"[^a-z0-9]+", "_", text.replace("'", "").replace("\u2019", "")
    ).strip("_")


_LOOKAROUND = re.compile(r"\(\?<?[=!](?:[^()]|\([^()]*\))*\)")


def _literal(rx: str):
    """The plain text a context rule matches, when it is a plain text between lookarounds."""
    core = _LOOKAROUND.sub("", rx).replace(r"\b", "").replace("\\", "")
    return core if core and not re.search(r"[\[\]()|?*+{}^$]", core) else None


@lru_cache(maxsize=1)
def replaced_pairs():
    """(old, new) for every name the tools replace, as folder-name slugs."""
    rbr = _load("replace_brand_residue")
    pairs = {}
    for old in rbr.MAP:
        pairs[old] = rbr.settled(old)
    for table in (
        rbr.CONTEXT_NAMES,
        rbr.CAR_MODEL_NAMES,
        rbr.AIRCRAFT_NAMES,
        rbr.PRE_EXISTING_RENAMES,
    ):
        for old, new in table.items():
            pairs.setdefault(old, new)
    for rx, new, _ in list(rbr.GENERIC_PHRASES):
        old = _literal(rx)
        if old and new:
            pairs.setdefault(old, new)
    try:
        rin = _load("rename_invented_names")
        for old, new in rin.NAMES_V2.items():
            pairs.setdefault(old, new if isinstance(new, str) else new[0])
    except Exception:  # noqa: BLE001 - the table is optional
        pass
    out = {}
    for old, new in pairs.items():
        so, sn = slug(old), slug(new)
        if len(so.replace("_", "")) >= 3 and sn and so != sn:
            out.setdefault(so, set()).add(sn)
    return out


@lru_cache(maxsize=1)
def brand_slugs():
    """Every real name on the brand lists (check_no_brands terms and the sweep terms), as slugs."""
    cnb = _load("check_no_brands")
    terms = (
        set(cnb.BRAND_TERMS)
        | set(cnb.EXTENDED_TERMS)
        | set(cnb.LOWER_TERMS)
        | set(cnb.SWEEP.SWEEP_TERMS)
    )
    terms |= set(cnb.CAR_MAKES) | set(cnb.CAR_MODELS) | set(cnb.PRODUCT_LINE_BRANDS)
    return {slug(t) for t in terms if len(slug(t).replace("_", "")) >= 3}


@lru_cache(maxsize=1)
def _prefix_index():
    idx = {}
    for so in replaced_pairs():
        for k in range(4, len(so) + 1):
            if k == len(so) or so[k] != "_":
                idx.setdefault(so[:k].rstrip("_"), set()).add(so)
    return idx


@lru_cache(maxsize=1)
def vocabulary():
    """Every word of the instance data: a folder-name ending that is a word is not a cut-off name."""
    words = set()
    for f in SCENARIOS.glob("*/*/instances/*/**/*.json"):
        words.update(
            slug(
                f.read_text(encoding="utf-8", errors="replace")
                .encode()
                .decode("unicode_escape", "ignore")
            ).split("_")
        )
    return words


@lru_cache(maxsize=1)
def _brand_prefixes():
    idx = {}
    for b in brand_slugs():
        for k in range(3, len(b)):
            if b[k] != "_" and b[k - 1] != "_":
                idx.setdefault(b[:k], set()).add(b)
    return idx


def _instance_text(folder: Path) -> str:
    parts = []
    for f in folder.rglob("*.json"):
        try:
            parts.append(
                json.dumps(
                    json.loads(f.read_text(encoding="utf-8")), ensure_ascii=False
                )
            )
        except ValueError:
            parts.append(f.read_text(encoding="utf-8", errors="replace"))
    return "_" + slug(" ".join(parts)) + "_"


def toks_full(name: str) -> str:
    return "_" + name + "_"


def folder_mismatches(folder: Path):
    """Old names spelled by this folder's name although its data uses the new name."""
    name = slug(folder.name)
    middle = re.sub(r"_\d+$", "", name)
    toks = middle.split("_")
    cands = set()
    padded = "_" + middle + "_"
    for so in replaced_pairs():
        if "_" + so + "_" in padded:
            cands.add(so)
    idx = _prefix_index()
    for k in range(
        1, min(5, len(toks)) + 1
    ):  # a name cut off at the end of the folder name
        cands |= idx.get("_".join(toks[-k:]), set())
    brands = (
        set()
    )  # (real name, the folder text around it, ending open if the name is cut off)
    scenario_toks = set(slug(folder.parent.parent.name).split("_"))
    for b in brand_slugs():
        i = padded.find("_" + b + "_")
        if (
            i >= 0
            and len(b.replace("_", "")) >= 5
            and not set(b.split("_")) <= scenario_toks
            and not ("_" not in b and b in vocabulary())
        ):
            before = padded[:i].rstrip("_").rsplit("_", 1)[-1]
            brands.add((b, "_" + (before + "_" if before else "") + b + "_"))
    for k in range(
        1, min(5, len(toks)) + 1
    ):  # a real name cut off at the end of a long
        cut = "_".join(toks[-k:])  # (title-made) folder name
        if len(cut) >= 3 and len(middle) >= 24 and toks[-1] not in vocabulary():
            for b in _brand_prefixes().get(cut, ()):
                brands.add((b, "_" + "_".join(toks[-k - 1 :])))
    if not cands and not brands:
        return []
    text = _instance_text(folder)
    bad = []
    for b, around in sorted(brands):
        if "_" + b + "_" in text or around in text:
            continue  # the folder name follows the data (a cut-off title)
        if not around.endswith("_") and "_" + around.rsplit("_", 1)[-1] + "_" in text:
            continue  # the end of the folder name is a whole word of the data
        bad.append(b)
    for so in sorted(cands):
        if "_" + so + "_" in text:
            continue  # the data still uses the old name here
        if any("_" + sn + "_" in text for sn in replaced_pairs()[so]) or (
            "_" in so and so in toks_full(name)
        ):
            bad.append(
                so
            )  # the data uses the new name, or never names this real name at all
    return sorted(set(bad))


def test_instance_folder_names_follow_their_data():
    bad = {}
    for folder in sorted(SCENARIOS.glob("*/*/instances/*")):
        if folder.is_dir():
            hits = folder_mismatches(folder)
            if hits:
                bad[str(folder.relative_to(SCENARIOS))] = hits
    assert not bad, f"{len(bad)} instance folders spell a replaced name: {bad}"

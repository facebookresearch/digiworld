#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Move the data from earlier invented names to their second-round names.

Some names the anonymisation pass invented turned out to be real brands or
products themselves ("Vantage", "Titan", "Solaris", ...). replace_brand_residue.py
maps every brand straight to its current name (NAMES_V2); this tool renames what
is already in the data.

Many of those names are also ordinary words or names the original data used for
something else ("Harmony Music School", "Titan 15 Laptop", the artist "Zara
Lumen"). So a name is only renamed where it stands for the brand it replaced:
each string is compared token by token with the same string in a checkout of the
commit before the anonymisation pass (--base-tree); a name that is new there is
a stand-in, a name that was already there stays. Strings without a counterpart
(session DBs, rootstores) take the decision made for the same field and value
in the aligned JSON; the rest fall back to the name alone (unambiguous names are
renamed, ambiguous ones are reported and kept).

Usage:
  git worktree add /tmp/base 6830c64a1 && git -C /tmp/base lfs pull
  python digiworld/scripts/rename_invented_names.py --base-tree /tmp/base --check
  python digiworld/scripts/rename_invented_names.py --base-tree /tmp/base --write
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sqlite3
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_no_brands as C  # noqa: E402
import replace_brand_residue as R  # noqa: E402
from replace_brand_residue import NAMES_V2, update_rows  # noqa: E402

# Old names with an ordinary or pre-existing reading; without provenance they are kept.
AMBIGUOUS = {
    "Harmony",
    "Summit",
    "Titan",
    "Nimbus",
    "Pinnacle",
    "Vertex",
    "Aria",
    "Prestige",
    "prestige",
    "Woodland",
    "Wanderer",
    "Reverie",
    "Boreal",
    "Strider",
    "Zap",
    "Concord",
    "Fenwick",
    "Hollis",
    "Cadwell",
    "Kendall's",
    "Lumen",
    "Vantage",
    "vantage",
    "Backcountry",
    "Solstice",
    "Solaris",
    "Electra",
    "Kestrel",
    "Luxor",
    "Prisma",
    "Fairmont",
    "Voyager",
    "Ranger",
    "Puffin",
    "Fortis",
    "Avella",
    "Bayline",
    "Skylight",
    "ES",
    "EX",
    "EY",
    "E3",
    "Old Harbor",
    "Ironhide",
    "Alterra",
    "Meridia",
    "Avanti",
    "Wayfarer",
    "Lucent",
    "Sonnet",
    "Ryze",
    "Canor",
    "canor",
    "Kindra",
    "Radion",
    "Silverpeak",
    "Ionis",
    "Civix",
    "Vivra",
    "IFSA",
    "MOVA",
    "Unipak",
    "Postline",
}
_OLD_RE = re.compile(
    r"(?<![\w-])("
    + "|".join(re.escape(k) for k in sorted(NAMES_V2, key=len, reverse=True))
    + r")(?![\w-])"
)
_TOKEN = re.compile(r"\w+|[^\w\s]")
# old name -> the brands the earlier pass replaced with it (from the replacement maps)
BRANDS_FOR = defaultdict(set)
for _brand, _name in R.MAP.items():
    for _m in _OLD_RE.finditer(_name):
        BRANDS_FOR[_m.group(1)].add(_brand)


def root_files(root: Path):
    pkg = root / "digiworld" / "digiworld"
    yield from sorted((pkg / "scenarios" / "scenarios").rglob("*.json"))
    yield from sorted((pkg / "state_data").rglob("*.json"))
    yield from sorted((pkg / "state_data").rglob("*.db"))
    if (root / "digiworld" / "ui_states").exists():
        yield from sorted((root / "digiworld" / "ui_states").rglob("*.json"))
    for name in ("tasks_list.jsonl", "scenario_list.json"):
        if (root / "digiworld" / name).exists():
            yield root / "digiworld" / name


def _maybe_json(v):
    if isinstance(v, str) and v[:1] in "[{":
        try:
            return json.loads(v)
        except ValueError:
            pass
    return v


def keyed_strings(v, key=None):
    """(key, string) pairs in a value, decoding JSON held in strings."""
    v = _maybe_json(v)
    if isinstance(v, dict):
        for k, x in v.items():
            yield from keyed_strings(x, k)
    elif isinstance(v, list):
        for x in v:
            yield from keyed_strings(x, key)
    elif isinstance(v, str):
        yield key, v


def file_strings(path: Path):
    if C.is_lfs_pointer(path):
        return
    if path.suffix == ".db":
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        try:
            for (t,) in con.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            ):
                if re.search(r"_fts(_|$)", t):
                    continue
                cols = [r[1] for r in con.execute(f'PRAGMA table_info("{t}")')]
                for row in con.execute(f'SELECT * FROM "{t}"'):
                    for c, v in zip(cols, row):
                        if isinstance(v, str):
                            yield from keyed_strings(v, c)
        except sqlite3.DatabaseError:
            pass
        finally:
            con.close()
    elif path.suffix == ".jsonl":
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                yield from keyed_strings(json.loads(line))
    else:
        try:
            yield from keyed_strings(json.loads(path.read_text(encoding="utf-8")))
        except (ValueError, UnicodeDecodeError):
            return


def aligned_pairs(a, b, key=None, out=None):
    """(key, head string, base string) for strings at the same JSON path."""
    a, b = _maybe_json(a), _maybe_json(b)
    if isinstance(a, dict) and isinstance(b, dict):
        for k in a.keys() & b.keys():
            aligned_pairs(a[k], b[k], k, out)
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for x, y in zip(a, b):
            aligned_pairs(x, y, key, out)
    elif isinstance(a, str) and isinstance(b, str):
        out.append((key, a, b))
    return out


def occurrences(s: str):
    return [(m.start(1), m.end(1), m.group(1)) for m in _OLD_RE.finditer(s)]


def brand_backed(name: str, base: str) -> bool:
    return any(
        re.search(r"(?<![\w-])" + re.escape(b) + r"(?![\w-])", base)
        for b in BRANDS_FOR.get(name, ())
    )


def verdicts(head: str, base: str, preexisting: bool = False):
    """'derived' (stands for a brand) or 'kept' per old-name occurrence in head.
    ``preexisting``: head also occurs verbatim in the base data (e.g. an artist
    name), so a changed counterpart only counts when it held the brand the old
    name replaced -- otherwise the instance was re-pointed, not anonymised."""
    th = [(m.start(), m.end(), m.group()) for m in _TOKEN.finditer(head)]
    sm = difflib.SequenceMatcher(
        None,
        [t[2] for t in th],
        [m.group() for m in _TOKEN.finditer(base)],
        autojunk=False,
    )
    same = [False] * len(th)
    for blk in sm.get_matching_blocks():
        for i in range(blk.a, blk.a + blk.size):
            same[i] = True
    new_spans = [(th[i][0], th[i][1]) for i in range(len(th)) if not same[i]]
    out = []
    for s, e, name in occurrences(head):
        d = any(a < e and b > s for a, b in new_spans)
        if d and preexisting and not brand_backed(name, base):
            d = False
        out.append("derived" if d else "kept")
    return tuple(out)


def renamed_paths(root: Path, base_rev: str) -> dict:
    out = subprocess.run(
        [
            "git",
            "-C",
            str(root),
            "diff",
            "-M",
            "--name-status",
            base_rev,
            "HEAD",
            "--",
            "digiworld",
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return {
        p[2]: p[1]
        for p in (line.split("\t") for line in out.splitlines())
        if p[0].startswith("R")
    }


class Decisions:
    def __init__(self, root: Path, base: Path):
        base_rev = subprocess.run(
            ["git", "-C", str(base), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        self.base_values = set()
        for p in root_files(base):
            self.base_values.update(s for _, s in file_strings(p))
        renames = renamed_paths(root, base_rev)
        by_key = defaultdict(Counter)
        for p in root_files(root):
            if p.suffix != ".json" or C.is_lfs_pointer(p):
                continue
            rel = str(p.relative_to(root))
            bp = base / renames.get(rel, rel)
            if not bp.exists() or C.is_lfs_pointer(bp):
                continue
            try:
                pairs = aligned_pairs(
                    json.loads(p.read_text(encoding="utf-8")),
                    json.loads(bp.read_text(encoding="utf-8")),
                    out=[],
                )
            except (ValueError, UnicodeDecodeError):
                continue
            for key, h, b in pairs:
                if _OLD_RE.search(h):
                    by_key[(key, h)][verdicts(h, b, h in self.base_values)] += 1
        self.keyed, by_value = {}, defaultdict(Counter)
        for (key, h), votes in by_key.items():
            if len(votes) == 1:
                v = next(iter(votes))
            elif (
                h in self.base_values
            ):  # the same text existed before: a pre-existing use
                v = tuple("kept" for _ in occurrences(h))
            else:
                v = max(votes, key=votes.get)
            self.keyed[(key, h)] = v
            by_value[h][v] += 1
        self.by_value = {h: next(iter(c)) for h, c in by_value.items() if len(c) == 1}
        self.undecided = Counter()

    def __call__(self, key, s: str):
        occ = occurrences(s)
        if not occ:
            return ()
        v = self.keyed.get((key, s)) or self.by_value.get(s)
        if v is not None:
            return v
        if s in self.base_values:
            return tuple("kept" for _ in occ)
        out = []
        for _, _, name in occ:
            if name in AMBIGUOUS:
                self.undecided[s] += 1
                out.append("kept")
            else:
                out.append("derived")
        return tuple(out)


def rename(s: str, key, decide: Decisions, counts: Counter) -> str:
    v = decide(key, s)
    if "derived" not in v:
        return s
    parts, i = [], 0
    for (a, b, name), verdict in zip(occurrences(s), v):
        parts.append(s[i:a])
        if verdict == "derived":
            parts.append(NAMES_V2[name])
            counts[name] += 1
        else:
            parts.append(name)
        i = b
    parts.append(s[i:])
    return "".join(parts)


def fix_json_text(raw: str, decide: Decisions, counts: Counter, key=None) -> str:
    """Rename inside JSON string values (keys and layout untouched)."""
    out, i, cur = [], 0, key
    for m in re.finditer(r'"((?:[^"\\]|\\.)*)"(\s*:)?', raw):
        out.append(raw[i : m.start()])
        body = m.group(1)
        if m.group(2):
            cur = json.loads(f'"{body}"')
            out.append(m.group(0))
        else:
            decoded = json.loads(f'"{body}"')
            if decoded[:1] in "[{" and _is_json(decoded):
                fixed = fix_json_text(decoded, decide, counts, cur)
            else:
                fixed = rename(decoded, cur, decide, counts)
            if fixed == decoded:
                out.append(m.group(0))
            else:
                out.append(
                    '"' + json.dumps(fixed, ensure_ascii=("\\u" in body))[1:-1] + '"'
                )
        i = m.end()
    out.append(raw[i:])
    return "".join(out)


def _is_json(v: str) -> bool:
    try:
        json.loads(v)
        return True
    except ValueError:
        return False


def fix_db(path: Path, decide: Decisions, counts: Counter, write: bool) -> int:
    con = sqlite3.connect(path)
    changed = 0
    tables = [
        r[0]
        for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql NOT LIKE '%VIRTUAL%'"
        )
    ]
    for t in tables:
        if re.search(r"_fts(_|$)", t):
            continue
        cols = [r[1] for r in con.execute(f'PRAGMA table_info("{t}")')]
        updates = []
        for row in con.execute(f'SELECT rowid, * FROM "{t}"').fetchall():
            upd = {}
            for c, v in zip(cols, row[1:]):
                if isinstance(v, str) and _OLD_RE.search(v):
                    nv = (
                        fix_json_text(v, decide, counts, c)
                        if v[:1] in "[{" and _is_json(v)
                        else rename(v, c, decide, counts)
                    )
                    if nv != v:
                        upd[c] = nv
            if upd:
                updates.append((upd, row[0]))
        changed += len(updates)
        if write and updates:
            update_rows(con, t, updates)  # triggers off: timestamps are not restamped
    if write and changed:
        for (t,) in con.execute(
            "SELECT name FROM sqlite_master WHERE sql LIKE '%VIRTUAL TABLE%fts%'"
        ).fetchall():
            try:
                con.execute(f'INSERT INTO "{t}"("{t}") VALUES(\'rebuild\')')
            except sqlite3.DatabaseError:
                pass
        con.commit()
    con.close()
    return changed


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    ap.add_argument(
        "--base-tree",
        type=Path,
        required=True,
        help="checkout (with LFS files) of the commit before the anonymisation pass",
    )
    ap.add_argument(
        "--report", type=Path, help="write the kept/undecided values here (JSON)"
    )
    args = ap.parse_args(argv)
    root = C.ROOT
    decide = Decisions(root, args.base_tree.resolve())
    counts, files = Counter(), 0
    for path in root_files(root):
        if C.is_lfs_pointer(path):
            continue
        if path.suffix == ".db":
            files += bool(fix_db(path, decide, counts, args.write))
            continue
        raw = path.read_text(encoding="utf-8")
        if not _OLD_RE.search(raw):
            continue
        if path.suffix == ".jsonl":
            new = "\n".join(
                fix_json_text(line, decide, counts) for line in raw.split("\n")
            )
        else:
            new = fix_json_text(raw, decide, counts)
        if new != raw:
            files += 1
            if args.write:
                path.write_text(new, encoding="utf-8")
    print(f"{sum(counts.values())} renames in {files} files")
    for name, n in counts.most_common():
        print(f"  {n:6d}  {name} -> {NAMES_V2[name]}")
    if decide.undecided:
        print(
            f"{len(decide.undecided)} values kept without provenance (ambiguous name):"
        )
        for s, n in decide.undecided.most_common(40):
            print(f"  {n:4d}  {s[:100]!r}")
    if args.report:
        args.report.write_text(
            json.dumps(
                {"undecided": dict(decide.undecided)}, indent=1, ensure_ascii=False
            )
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

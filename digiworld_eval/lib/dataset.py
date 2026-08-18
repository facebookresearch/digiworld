# Copyright (c) Meta Platforms, Inc. and affiliates.
# Minimal iterable dataset for the eval, reading simple jsonl task lists
# (one JSON object per line).

import json
from collections.abc import Callable, Iterable, Iterator
from pathlib import Path
from typing import Any

from digiworld_eval.lib.core.datatypes import BaseTextDatum, DictDatum


class Dataset:
    """A tiny single-pass iterable of data with from_jsonl / map / chain."""

    def __init__(self, items: Iterable[Any]) -> None:
        self._items = items

    def __iter__(self) -> Iterator[Any]:
        return iter(self._items)

    @classmethod
    def from_jsonl(cls, path: Path | str) -> "Dataset":
        def _gen() -> Iterator[DictDatum]:
            with open(path) as f:
                for line_no, line in enumerate(f):
                    line = line.strip()
                    if not line:
                        continue
                    yield DictDatum(
                        val=json.loads(line),
                        src=BaseTextDatum.Source(
                            path=str(path), line_no=line_no, pos=0
                        ),
                    )

        return cls(_gen())

    def map(self, fn: Callable[[Any], Any]) -> "Dataset":
        def _gen() -> Iterator[Any]:
            for item in self._items:
                yield fn(item)

        return Dataset(_gen())

    @classmethod
    def chain(cls, datasets: list["Dataset"]) -> "Dataset":
        def _gen() -> Iterator[Any]:
            for ds in datasets:
                yield from ds

        return cls(_gen())

    @staticmethod
    def register_package(package: Any) -> None:
        # No-op: kept for API compatibility; not needed for local jsonl datasets.
        pass

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Constraint types for profile compatibility checking.

Constraints are evaluated at generation time against each profile's
SQLite database to determine which profiles an instance can run against.
Only *pre-injection* constraints belong here -- things that must already
exist in the profile DB before mockdata is appended.
"""

import sqlite3
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, Optional, Union


class Constraint(ABC):
    """Base class for profile compatibility constraints."""

    @abstractmethod
    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        """Return True if the profile satisfies this constraint for the given instance params."""
        ...

    @abstractmethod
    def describe(self) -> str:
        """Human-readable description for logging."""
        ...


class EntityExistsConstraint(Constraint):
    """Check that a table has at least ``min_count`` rows, optionally filtered."""

    def __init__(
        self,
        table: str,
        min_count: int = 1,
        user_filter: bool = False,
        filter: Optional[Dict[str, Any]] = None,
    ):
        self.table = table
        self.min_count = min_count
        self.user_filter = user_filter
        self.filter = filter or {}

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        where_parts = []
        bind_vals: list = []

        if self.user_filter:
            where_parts.append("user_id = 1")

        for col, val in self.filter.items():
            resolved = val(params) if callable(val) else val
            where_parts.append(f"{col} = ?")
            bind_vals.append(resolved)

        where_clause = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
        query = f"SELECT COUNT(*) FROM {self.table}{where_clause}"
        try:
            row = conn.execute(query, bind_vals).fetchone()
            return (row[0] if row else 0) >= self.min_count
        except sqlite3.OperationalError:
            return False

    def describe(self) -> str:
        return f"EntityExists({self.table}, min={self.min_count}, user_filter={self.user_filter})"


class BalanceConstraint(Constraint):
    """Check that at least one row in ``table`` has ``field`` >= min_value."""

    def __init__(
        self,
        table: str,
        field: str,
        min_value: Union[float, Callable[[Dict], float]],
        user_filter: bool = False,
    ):
        self.table = table
        self.field = field
        self._min_value = min_value
        self.user_filter = user_filter

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        threshold = self._min_value(params) if callable(self._min_value) else self._min_value

        where_parts = [f"{self.field} >= ?"]
        bind_vals: list = [threshold]

        if self.user_filter:
            where_parts.append("user_id = 1")

        where_clause = " WHERE " + " AND ".join(where_parts)
        query = f"SELECT COUNT(*) FROM {self.table}{where_clause}"
        try:
            row = conn.execute(query, bind_vals).fetchone()
            return (row[0] if row else 0) >= 1
        except sqlite3.OperationalError:
            return False

    def describe(self) -> str:
        return f"Balance({self.table}.{self.field} >= {self._min_value})"


class DataVolumeConstraint(Constraint):
    """Check that a table has at least ``min_count`` rows matching a filter."""

    def __init__(
        self,
        table: str,
        min_count: Union[int, Callable[[Dict], int]] = 1,
        filter: Optional[Dict[str, Any]] = None,
        user_filter: bool = False,
    ):
        self.table = table
        self._min_count = min_count
        self.filter = filter or {}
        self.user_filter = user_filter

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        threshold = self._min_count(params) if callable(self._min_count) else self._min_count

        where_parts = []
        bind_vals: list = []

        if self.user_filter:
            where_parts.append("user_id = 1")

        for col, val in self.filter.items():
            resolved = val(params) if callable(val) else val
            where_parts.append(f"{col} = ?")
            bind_vals.append(resolved)

        where_clause = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
        query = f"SELECT COUNT(*) FROM {self.table}{where_clause}"
        try:
            row = conn.execute(query, bind_vals).fetchone()
            return (row[0] if row else 0) >= threshold
        except sqlite3.OperationalError:
            return False

    def describe(self) -> str:
        return f"DataVolume({self.table}, min={self._min_count}, filter={self.filter})"


class MaxCountConstraint(Constraint):
    """Check that a table has at most ``max_count`` rows, optionally filtered.

    Useful for scenarios that add records to tables with an application-enforced
    capacity limit (e.g. max 3 addresses, max 2 payment methods).
    """

    def __init__(
        self,
        table: str,
        max_count: int = 1,
        user_filter: bool = False,
        filter: Optional[Dict[str, Any]] = None,
    ):
        self.table = table
        self.max_count = max_count
        self.user_filter = user_filter
        self.filter = filter or {}

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        where_parts: list = []
        bind_vals: list = []

        if self.user_filter:
            where_parts.append("user_id = 1")

        for col, val in self.filter.items():
            resolved = val(params) if callable(val) else val
            where_parts.append(f"{col} = ?")
            bind_vals.append(resolved)

        where_clause = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
        query = f"SELECT COUNT(*) FROM {self.table}{where_clause}"
        try:
            row = conn.execute(query, bind_vals).fetchone()
            return (row[0] if row else 0) <= self.max_count
        except sqlite3.OperationalError:
            return False

    def describe(self) -> str:
        return f"MaxCount({self.table}, max={self.max_count}, user_filter={self.user_filter})"

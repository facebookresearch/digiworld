# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Unified positioning service for all apps (email, payment, etc.).
"""

import sqlite3
import logging
from datetime import datetime, timedelta, timezone
import random
from typing import Dict, List, Optional, Any, Callable, Sequence, Tuple, Union
from dataclasses import dataclass
from enum import Enum


class Position(str, Enum):
    beginning = 'beginning'
    middle = 'middle'
    end = 'end'


class InsufficientDataError(ValueError):
    pass


class InvalidTimestampError(ValueError):
    pass


class QueryError(RuntimeError):
    pass


@dataclass(frozen=True)
class PositioningConfig:
    """Typed configuration describing how to query timestamps."""
    table_name: str
    timestamp_column: str
    filter_column: Optional[str] = None
    filter_pattern: Optional[str] = None  # e.g., "%{user_email}%"; will be formatted with user_email
    additional_filters: Optional[Dict[str, Any]] = None  # e.g., {'folder': 'inbox'} for exact match filters


@dataclass
class PositioningData:
    """Container for positioning data from repository queries."""
    timestamps: List[str]
    count: int
    earliest: Optional[str] = None
    latest: Optional[str] = None

    @property
    def has_data(self) -> bool:
        return len(self.timestamps) > 0


class Clock:
    """Clock interface to allow deterministic testing."""

    def now(self) -> datetime:
        return datetime.now()


class Jitter:
    """Jitter provider for controlled randomness in strategies."""

    def hours(self, min_hours: int, max_hours: int) -> int:
        return random.randint(min_hours, max_hours)


class TimestampRepository:
    """Repository responsible for fetching and pre-filtering timestamps from storage."""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def fetch(self, db_path: str, user_email: str, config: PositioningConfig) -> List[str]:
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            table_name = config.table_name
            timestamp_column = config.timestamp_column
            filter_column = config.filter_column
            filter_pattern = config.filter_pattern
            additional_filters = config.additional_filters or {}

            # Build WHERE clauses
            where_clauses = []
            params = []
            
            if user_email and filter_column and filter_pattern:
                pattern = filter_pattern.format(user_email=user_email)
                where_clauses.append(f"{filter_column} LIKE ?")
                params.append(pattern)
            
            # Add additional exact match filters (e.g., folder='inbox')
            for column, value in additional_filters.items():
                where_clauses.append(f"{column} = ?")
                params.append(value)
            
            # Build and execute query
            if where_clauses:
                where_clause = " AND ".join(where_clauses)
                query = f"""
                    SELECT {timestamp_column} FROM {table_name}
                    WHERE {where_clause}
                    ORDER BY {timestamp_column} ASC
                """
                cursor.execute(query, tuple(params))
                raw_timestamps = [row[0] for row in cursor.fetchall()]
            else:
                cursor.execute(f"SELECT {timestamp_column} FROM {table_name} ORDER BY {timestamp_column} ASC")
                raw_timestamps = [row[0] for row in cursor.fetchall()]

            conn.close()

            # Normalize: convert integer Unix timestamps to ISO strings
            normalized = []
            for ts in raw_timestamps:
                if isinstance(ts, (int, float)):
                    normalized.append(datetime.fromtimestamp(ts, tz=timezone.utc).isoformat().replace("+00:00", "Z"))
                elif ts is not None:
                    normalized.append(str(ts))
            raw_timestamps = normalized

            self.logger.debug("PositioningRepository: Query returned %d items", len(raw_timestamps))
            return raw_timestamps
        except Exception as e:
            raise QueryError(
                f"Database query failed for positioning: {e}. "
                f"Database: {db_path}, User: {user_email}, Table: {getattr(config, 'table_name', 'unknown')}"
            )


class PositionStrategy:
    def compute(self, timestamps: Sequence[str], clock: Clock, jitter: Jitter) -> str:
        raise NotImplementedError


class MiddleStrategy(PositionStrategy):
    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def compute(self, timestamps: Sequence[str], clock: Clock, jitter: Jitter) -> str:
        if len(timestamps) < 2:
            raise InsufficientDataError(f"Cannot position in middle: need at least 2 timestamps, got {len(timestamps)}")

        middle_idx = len(timestamps) // 2
        if middle_idx == 0:
            raise InsufficientDataError(f"Cannot position in middle: middle_idx is 0 with {len(timestamps)} timestamps")

        try:
            before_timestamp = timestamps[middle_idx - 1]
            middle_timestamp = timestamps[middle_idx]

            before_normalized = before_timestamp.replace('Z', '+00:00')
            middle_normalized = middle_timestamp.replace('Z', '+00:00')

            before_time = datetime.fromisoformat(before_normalized)
            middle_time = datetime.fromisoformat(middle_normalized)

            time_diff = middle_time - before_time
            midpoint_time = before_time + (time_diff / 2)
            result = self._to_iso_z(midpoint_time)
            self.logger.debug(
                "PositioningService: Middle positioning - between %s and %s, result: %s",
                before_timestamp, middle_timestamp, result
            )
            return result
        except (ValueError, TypeError) as e:
            raise InvalidTimestampError(
                f"Cannot parse timestamps for middle positioning: {e}. Before: '{before_timestamp}', Middle: '{middle_timestamp}'."
            )

    def _to_iso_z(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        dt_utc = dt.astimezone(timezone.utc)
        iso_str = dt_utc.isoformat()
        return iso_str.replace("+00:00", "Z")


class BeginningStrategy(PositionStrategy):
    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def compute(self, timestamps: Sequence[str], clock: Clock, jitter: Jitter) -> str:
        if not timestamps:
            raise InsufficientDataError("Cannot position at beginning: no timestamps provided")

        try:
            latest_timestamp = timestamps[-1].replace('Z', '+00:00')
            latest_time = datetime.fromisoformat(latest_timestamp)
            current_time = clock.now().replace(tzinfo=latest_time.tzinfo) if latest_time.tzinfo else clock.now()

            max_future_hours = int((current_time - latest_time).total_seconds() // 3600)
            if max_future_hours <= 1:
                raise InsufficientDataError(
                    f"Cannot position at beginning: latest item is too recent. Latest: {latest_time}, now: {current_time}. Need > 1h gap."
                )

            hours_to_add = min(24, max_future_hours)
            new_time = latest_time + timedelta(hours=jitter.hours(1, hours_to_add))
            self.logger.debug("PositioningService: Beginning positioning - after %s, result: %s", timestamps[-1], new_time.isoformat())
            return self._to_iso_z(new_time)
        except (ValueError, TypeError) as e:
            raise InvalidTimestampError(f"Cannot parse timestamp for beginning positioning: {e}. Latest: '{timestamps[-1]}'")

    def _to_iso_z(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        dt_utc = dt.astimezone(timezone.utc)
        iso_str = dt_utc.isoformat()
        return iso_str.replace("+00:00", "Z")


class EndStrategy(PositionStrategy):
    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def compute(self, timestamps: Sequence[str], clock: Clock, jitter: Jitter) -> str:
        if not timestamps:
            raise InsufficientDataError("Cannot position at end: no timestamps provided")

        try:
            earliest_time = datetime.fromisoformat(timestamps[0].replace('Z', '+00:00'))
            new_time = earliest_time - timedelta(hours=jitter.hours(1, 48))
            self.logger.debug("PositioningService: End positioning - before %s, result: %s", timestamps[0], new_time.isoformat())
            return self._to_iso_z(new_time)
        except (ValueError, TypeError) as e:
            raise InvalidTimestampError(f"Cannot parse timestamp for end positioning: {e}. Earliest: '{timestamps[0]}'")

    def _to_iso_z(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        dt_utc = dt.astimezone(timezone.utc)
        iso_str = dt_utc.isoformat()
        return iso_str.replace("+00:00", "Z")


RecordFilter = Callable[[Sequence[str]], Sequence[str]]


@dataclass
class PositioningService:
    """
    Unified service for generating positioned timestamps across all apps.

    Handles database queries, positioning calculations, and timestamp generation
    in a clean, testable way without inheritance complexity.
    """

    def __init__(
        self,
        app_config: Union[Dict[str, Any], PositioningConfig],
        debug: bool = False,
        *,
        logger: Optional[logging.Logger] = None,
        clock: Optional[Clock] = None,
        jitter: Optional[Jitter] = None,
        record_filters: Optional[List[RecordFilter]] = None,
        enable_cache: bool = True,
    ):
        """
        Initialize positioning service.

        Args:
            app_config: App-specific configuration (table names, columns, etc.)
            debug: Whether to enable DEBUG logging level
            logger: Optional logger instance
            clock: Optional clock provider
            jitter: Optional jitter provider
            record_filters: Optional list of filters to apply to raw timestamps
            enable_cache: Whether to cache repository results per (db_path, user_email)
        """
        # Typed configuration
        if isinstance(app_config, PositioningConfig):
            self.config = app_config
        else:
            self.config = PositioningConfig(
                table_name=app_config.get('table_name'),
                timestamp_column=app_config.get('timestamp_column'),
                filter_column=app_config.get('filter_column'),
                filter_pattern=app_config.get('filter_pattern'),
                additional_filters=app_config.get('additional_filters'),
            )

        # Logging
        self.logger = logger or logging.getLogger(__name__)
        if debug:
            self.logger.setLevel(logging.DEBUG)

        # Providers
        self.clock = clock or Clock()
        self.jitter = jitter or Jitter()

        # Repository and strategies
        self.repository = TimestampRepository(self.logger)
        self.strategies: Dict[Position, PositionStrategy] = {
            Position.middle: MiddleStrategy(self.logger),
            Position.beginning: BeginningStrategy(self.logger),
            Position.end: EndStrategy(self.logger),
        }

        # Filters
        default_filters: List[RecordFilter] = [self._filter_template_strings]
        self.record_filters = record_filters or default_filters

        # Cache
        self.enable_cache = enable_cache
        self._cache: Dict[Tuple[str, str], List[str]] = {}

    def get_positioned_timestamp(self, position: Union[str, Position], db_path: str, user_email: str) -> str:
        """
        Generate a timestamp positioned relative to existing data.

        Args:
            position: 'beginning', 'middle', or 'end'
            db_path: Path to SQLite database
            user_email: Current user's email for filtering

        Returns:
            ISO timestamp string positioned appropriately
        """
        self.logger.debug("PositioningService: Generating %s timestamp for %s", position, user_email)

        # Step 1: Get positioning data from database
        positioning_data = self._get_positioning_data(db_path, user_email)
        self.logger.debug("PositioningService: Found %d items for positioning", positioning_data.count)

        # Step 2: Calculate positioned timestamp
        return self._calculate_positioned_timestamp(position, positioning_data)

    def _get_positioning_data(self, db_path: str, user_email: str) -> PositioningData:
        """Fetch and filter timestamps using repository and configured filters."""
        # Include additional_filters in cache key to avoid stale results
        filters_tuple = tuple(sorted(self.config.additional_filters.items())) if self.config.additional_filters else ()
        cache_key = (db_path, user_email, filters_tuple)
        if self.enable_cache and cache_key in self._cache:
            raw_timestamps = self._cache[cache_key]
        else:
            raw_timestamps = self.repository.fetch(db_path, user_email, self.config)
            if self.enable_cache:
                self._cache[cache_key] = raw_timestamps

        timestamps_seq: Sequence[str] = raw_timestamps
        for record_filter in self.record_filters:
            timestamps_seq = record_filter(timestamps_seq)

        timestamps = list(timestamps_seq)
        count = len(timestamps)

        if count:
            self.logger.debug("PositioningService: Using %d timestamps for positioning", count)
            self.logger.debug("PositioningService: Timestamp range: %s to %s", timestamps[0], timestamps[-1])
        else:
            self.logger.debug("PositioningService: No resolved timestamps found after filtering")

        return PositioningData(
            timestamps=timestamps,
            count=count,
            earliest=timestamps[0] if timestamps else None,
            latest=timestamps[-1] if timestamps else None
        )

    def _calculate_positioned_timestamp(self, position: Union[str, Position], data: PositioningData) -> str:
        """Calculate positioned timestamp using clean logic. FAILS EXPLICITLY if positioning cannot be computed correctly."""
        if not data.has_data:
            raise InsufficientDataError(
                f"Cannot position '{position}': No existing items found. Need at least 2 for correct positioning."
            )

        if len(data.timestamps) == 1:
            raise InsufficientDataError(
                f"Cannot position '{position}': Only 1 existing item found. Need at least 2 for relative positioning."
            )

        if len(data.timestamps) < 2:
            raise InsufficientDataError(
                f"Cannot position '{position}': Insufficient items for positioning. Found {len(data.timestamps)}."
            )

        # Accept both enum and string inputs for compatibility
        if isinstance(position, str):
            try:
                pos_enum = Position(position)
            except ValueError:
                raise ValueError(f"Unknown positioning type: '{position}'. Must be 'beginning', 'middle', or 'end'.")
        else:
            pos_enum = position

        strategy = self.strategies[pos_enum]
        return strategy.compute(data.timestamps, self.clock, self.jitter)

    def _is_template_string(self, value: str) -> bool:
        """
        Check if a string is a template variable (contains {{...}} or legacy {..}).

        Args:
            value: String to check

        Returns:
            True if the string appears to be a template variable
        """
        if not isinstance(value, str):
            return False
        
        if '{{' in value and '}}' in value:
            return True
        
        # Legacy single-brace placeholder used in some mockdata
        # Only treat as template when the entire string is a single-brace token
        # with a template-like name (word characters only)
        import re
        return re.fullmatch(r"\{\w+\}", value) is not None

    def _filter_template_strings(self, values: Sequence[str]) -> Sequence[str]:
        return [v for v in values if not self._is_template_string(v)]

    def _to_iso_z(self, dt: datetime) -> str:
        """Normalize a datetime to ISO 8601 string with 'Z' (UTC) suffix."""
        if dt.tzinfo is None:
            # Treat naive datetimes as UTC
            return dt.isoformat() + "Z"
        dt_utc = dt.astimezone(timezone.utc)
        iso_str = dt_utc.isoformat()
        return iso_str.replace("+00:00", "Z")
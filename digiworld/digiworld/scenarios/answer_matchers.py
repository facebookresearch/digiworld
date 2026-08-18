# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Reusable answer-matching utilities for ComposableScenario checks.

All functions are pure -- no state, no side effects.  Scenarios import
whichever matchers they need and call them inside ``_get_checks()``.
"""

import datetime
import re
from typing import Optional


# ---------------------------------------------------------------------------
# Integer matching
# ---------------------------------------------------------------------------

_ABBREVIATED_NUMBER_RE = re.compile(
    r"([\d,]+(?:\.\d+)?)\s*([KkMmBbTt])\b"
)

_ABBREV_MULTIPLIERS = {
    "k": 1_000,
    "m": 1_000_000,
    "b": 1_000_000_000,
    "t": 1_000_000_000_000,
}


def extract_integers(text: str) -> list[int]:
    """Extract all integers from *text*, including abbreviated forms like 3.4K.

    >>> extract_integers("1,234 subscribers and 56 views")
    [1234, 56]
    >>> extract_integers("3.4K views")
    [3400]
    >>> extract_integers("1.2M subscribers")
    [1200000]
    """
    results: list[int] = []
    consumed_spans: list[tuple[int, int]] = []

    for m in _ABBREVIATED_NUMBER_RE.finditer(text):
        raw = m.group(1).replace(",", "")
        multiplier = _ABBREV_MULTIPLIERS[m.group(2).lower()]
        results.append(int(float(raw) * multiplier))
        consumed_spans.append(m.span())

    for m in re.finditer(r"[\d,]+", text):
        if any(s <= m.start() < e for s, e in consumed_spans):
            continue
        raw = m.group().replace(",", "")
        if raw.isdigit():
            results.append(int(raw))

    return results


def numeric_match(agent_answer: str, expected: int) -> bool:
    """True if *expected* appears among the integers in the agent's answer."""
    return expected in extract_integers(agent_answer)


def extract_abbreviated_numbers(text: str) -> list[float]:
    """Extract numbers with K/M/B suffixes and convert to actual values.
    
    >>> extract_abbreviated_numbers("34.4K subscribers")
    [34400.0]
    >>> extract_abbreviated_numbers("1.2M views")
    [1200000.0]
    >>> extract_abbreviated_numbers("500 likes")
    [500.0]
    """
    pattern = re.compile(r"([\d,]+(?:\.\d+)?)\s*([KMB])?", re.IGNORECASE)
    results: list[float] = []
    
    for match in pattern.finditer(text):
        num_str = match.group(1).replace(",", "")
        suffix = match.group(2)
        
        if not num_str:
            continue
            
        try:
            num = float(num_str)
            
            if suffix:
                suffix_upper = suffix.upper()
                if suffix_upper == "K":
                    num *= 1000
                elif suffix_upper == "M":
                    num *= 1000000
                elif suffix_upper == "B":
                    num *= 1000000000
            
            results.append(num)
        except ValueError:
            continue
    
    return results


def rounded_numeric_match(agent_answer: str, expected: int, tolerance_percent: float = 5.0) -> bool:
    """True if *expected* matches a number in the agent's answer within tolerance.
    
    Handles abbreviated numbers like "34.4K" (34,400) or "1.2M" (1,200,000).
    The tolerance allows for rounding differences (default 5%).
    
    >>> rounded_numeric_match("34.4K subscribers", 34567, tolerance_percent=5.0)
    True
    >>> rounded_numeric_match("1.2M views", 1234567, tolerance_percent=5.0)
    True
    """
    extracted = extract_abbreviated_numbers(agent_answer)
    
    for num in extracted:
        # Calculate the acceptable range based on tolerance
        tolerance = expected * (tolerance_percent / 100.0)
        if abs(num - expected) <= tolerance:
            return True
    
    # Also check for exact integer matches as fallback
    return numeric_match(agent_answer, expected)


# ---------------------------------------------------------------------------
# Float / decimal matching
# ---------------------------------------------------------------------------

_NUMBER_RE = re.compile(r"[\$%]?\s*(\d[\d,]*(?:\.\d+)?)\s*[%]?")


def extract_numbers(text: str) -> list[float]:
    """Extract all numbers (int or float) from *text*, stripping ``$``, ``%``, commas.

    >>> extract_numbers("$12.99 and 4.5 stars, 15% off")
    [12.99, 4.5, 15.0]
    """
    results: list[float] = []
    for m in _NUMBER_RE.finditer(text):
        raw = m.group(1).replace(",", "")
        results.append(float(raw))
    return results


def float_match(agent_answer: str, expected: float, tolerance: float = 0.01) -> bool:
    """True if any extracted number is within *tolerance* of *expected*."""
    return any(abs(n - expected) <= tolerance for n in extract_numbers(agent_answer))


# ---------------------------------------------------------------------------
# String matching
# ---------------------------------------------------------------------------

# Maps common Unicode lookalikes to their plain ASCII equivalents so that
# comparisons between DB-stored text (which may contain curly quotes, dashes,
# non-breaking spaces, etc.) and agent answers (which are usually ASCII) work
# reliably.
_UNICODE_NORM: dict[str, str] = {
    "\u2019": "'",   # right single quotation mark  →  '
    "\u2018": "'",   # left single quotation mark   →  '
    "\u201c": '"',   # left double quotation mark   →  "
    "\u201d": '"',   # right double quotation mark  →  "
    "\u2011": "-",   # non-breaking hyphen          →  -
    "\u2012": "-",   # figure dash                  →  -
    "\u2013": "-",   # en dash                      →  -
    "\u2014": "-",   # em dash                      →  -
    "\u202f": " ",   # narrow no-break space        →  (space)
    "\u00a0": " ",   # non-breaking space           →  (space)
    "\u00d7": "x",   # multiplication sign ×        →  x
    "\u2026": "...", # horizontal ellipsis          →  ...
}


def _normalize_text(text: str) -> str:
    """Normalize Unicode lookalikes to plain ASCII and lowercase."""
    for ch, replacement in _UNICODE_NORM.items():
        text = text.replace(ch, replacement)
    return text.lower()


def substring_match(agent_answer: str, expected: str) -> bool:
    """Case-insensitive check that *expected* appears in *agent_answer*.

    Unicode lookalikes (curly quotes, en/em dashes, non-breaking spaces, etc.)
    in either string are normalised to their plain ASCII equivalents before
    comparison, so DB-stored text with smart quotes matches agent answers that
    use straight quotes.
    """
    return _normalize_text(expected) in _normalize_text(agent_answer)


def all_substrings_match(agent_answer: str, expected_items: list[str]) -> bool:
    """True if ALL *expected_items* appear (case-insensitive) in *agent_answer*."""
    normalized = _normalize_text(agent_answer)
    return all(_normalize_text(item) in normalized for item in expected_items)


def comma_separated_match(agent_answer: str, expected: str) -> bool:
    """True if all comma-separated parts of *expected* appear in *agent_answer*.

    Unlike ``substring_match`` which requires the entire string verbatim,
    this splits on commas and checks each part independently, so reordering
    or extra words between parts still match.
    """
    normalized_answer = _normalize_text(agent_answer)
    parts = [_normalize_text(p.strip()) for p in expected.split(",") if p.strip()]
    return all(part in normalized_answer for part in parts)


# ---------------------------------------------------------------------------
# Boolean matching
# ---------------------------------------------------------------------------

_YES_KEYWORDS = {"yes", "true", "correct", "it is", "it does", "there are", "there is"}
_NO_KEYWORDS = {"no", "false", "incorrect", "it is not", "it does not", "it doesn't",
                "there are not", "there aren't", "there is not", "there isn't", "none"}


def boolean_match(agent_answer: str, expected: bool) -> bool:
    """Check whether the agent answered affirmatively or negatively."""
    lower = agent_answer.lower()
    if expected:
        if any(kw in lower for kw in _YES_KEYWORDS):
            return True
        if any(kw in lower for kw in _NO_KEYWORDS):
            return False
        # A positive count implies affirmative (e.g., "You have 3 pending bills")
        if any(n > 0 for n in extract_integers(lower)):
            return True
        return False
    return any(kw in lower for kw in _NO_KEYWORDS)


# ---------------------------------------------------------------------------
# Duration matching
# ---------------------------------------------------------------------------

_DURATION_HH_MM_SS = re.compile(r"(\d+):(\d{2}):(\d{2})")
_DURATION_MM_SS = re.compile(r"(\d+):(\d{2})")
_DURATION_WORDS = re.compile(
    r"(?:(\d+)\s*(?:hours?|hrs?|h))?\s*"
    r"(?:(\d+)\s*(?:minutes?|mins?|m))?\s*"
    r"(?:(\d+)\s*(?:seconds?|secs?|s))?",
    re.IGNORECASE,
)
_DURATION_TOTAL_SECONDS = re.compile(r"(\d+)\s*(?:seconds?|secs?|s)\b", re.IGNORECASE)


def parse_duration_seconds(text: str) -> Optional[int]:
    """Parse a duration string into total seconds.

    Handles ``"1:07:10"``, ``"7:10"``, ``"7 minutes 10 seconds"``,
    ``"7m10s"``, ``"430 seconds"``, ``"1 hour 5 minutes"``.
    Returns ``None`` when no duration pattern is found.
    """
    m = _DURATION_HH_MM_SS.search(text)
    if m:
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))

    m = _DURATION_MM_SS.search(text)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))

    m = _DURATION_WORDS.search(text)
    if m and any(m.group(i) for i in (1, 2, 3)):
        hours = int(m.group(1) or 0)
        minutes = int(m.group(2) or 0)
        seconds = int(m.group(3) or 0)
        return hours * 3600 + minutes * 60 + seconds

    m = _DURATION_TOTAL_SECONDS.search(text)
    if m:
        return int(m.group(1))

    return None


def duration_match(agent_answer: str, expected_seconds: int, tolerance_seconds: int = 5) -> bool:
    """True if the parsed duration is within *tolerance_seconds* of *expected_seconds*."""
    parsed = parse_duration_seconds(agent_answer)
    if parsed is None:
        return False
    return abs(parsed - expected_seconds) <= tolerance_seconds


# ---------------------------------------------------------------------------
# Date matching
# ---------------------------------------------------------------------------

_DATE_FORMATS = [
    "%B %d, %Y",       # February 20, 2026
    "%b %d, %Y",       # Feb 20, 2026
    "%Y-%m-%d",         # 2026-02-20
    "%m/%d/%Y",         # 02/20/2026
    "%d %B %Y",         # 20 February 2026
    "%d %b %Y",         # 20 Feb 2026
]


_RELATIVE_DATE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"(\d+)\s*(?:seconds?|secs?|s)\s*ago", re.I), "seconds"),
    (re.compile(r"(\d+)\s*(?:minutes?|mins?|m)\s*ago", re.I), "minutes"),
    (re.compile(r"(\d+)\s*(?:hours?|hrs?|h)\s*ago", re.I), "hours"),
    (re.compile(r"(\d+)\s*(?:days?|d)\s*ago", re.I), "days"),
    (re.compile(r"(\d+)\s*(?:weeks?|wks?|w)\s*ago", re.I), "weeks"),
    (re.compile(r"(\d+)\s*(?:months?|mos?)\s*ago", re.I), "months"),
    (re.compile(r"(\d+)\s*(?:years?|yrs?|y)\s*ago", re.I), "years"),
    (re.compile(r"\byesterday\b", re.I), "yesterday"),
    (re.compile(r"\blast\s+week\b", re.I), "last_week"),
    (re.compile(r"\blast\s+month\b", re.I), "last_month"),
]


def _parse_relative_date(text: str) -> Optional[datetime.date]:
    """Parse relative date expressions like '3 days ago', '2w ago'."""
    today = datetime.date.today()
    for pattern, unit in _RELATIVE_DATE_PATTERNS:
        m = pattern.search(text)
        if not m:
            continue
        if unit == "yesterday":
            return today - datetime.timedelta(days=1)
        if unit == "last_week":
            return today - datetime.timedelta(weeks=1)
        if unit == "last_month":
            return today - datetime.timedelta(days=30)
        amount = int(m.group(1))
        if unit == "seconds" or unit == "minutes" or unit == "hours":
            return today
        if unit == "days":
            return today - datetime.timedelta(days=amount)
        if unit == "weeks":
            return today - datetime.timedelta(weeks=amount)
        if unit == "months":
            return today - datetime.timedelta(days=amount * 30)
        if unit == "years":
            return today - datetime.timedelta(days=amount * 365)
    return None


def extract_date(text: str) -> Optional[datetime.date]:
    """Try to parse a date from *text* using common formats and relative
    expressions like '3 days ago' or '2w ago'."""
    cleaned = text.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue

    date_pattern = re.compile(
        r"(\d{4}-\d{2}-\d{2})|"
        r"(\w+ \d{1,2},?\s*\d{4})|"
        r"(\d{1,2}/\d{1,2}/\d{4})|"
        r"(\d{1,2} \w+ \d{4})"
    )
    for m in date_pattern.finditer(text):
        candidate = m.group(0).strip().rstrip(",")
        for fmt in _DATE_FORMATS:
            try:
                return datetime.datetime.strptime(candidate, fmt).date()
            except ValueError:
                continue

    return _parse_relative_date(text)

_RELATIVE_DATE_PATTERN = re.compile(
    r"(\d+)\s*(mo|month|months|w|week|weeks|d|day|days|h|hour|hours|m|min|minute|minutes)\s*ago",
    re.IGNORECASE
)


def parse_relative_date(text: str, reference_date: datetime.date = None) -> Optional[datetime.date]:
    """Parse relative date expressions like '1mo ago', '2 weeks ago', '5d ago'.
    
    Returns the approximate date based on the relative expression.
    """
    if reference_date is None:
        reference_date = datetime.date.today()
    
    match = _RELATIVE_DATE_PATTERN.search(text.lower())
    if not match:
        return None
    
    amount = int(match.group(1))
    unit = match.group(2).lower()
    
    # Convert to days
    if unit in ('mo', 'month', 'months'):
        days = amount * 30  # Approximate
    elif unit in ('w', 'week', 'weeks'):
        days = amount * 7
    elif unit in ('d', 'day', 'days'):
        days = amount
    elif unit in ('h', 'hour', 'hours'):
        days = amount / 24
    elif unit in ('m', 'min', 'minute', 'minutes'):
        days = amount / (24 * 60)
    else:
        return None
    
    return reference_date - datetime.timedelta(days=days)


def relative_date_match(agent_answer: str, expected_date: datetime.date, tolerance_days: int = 3) -> bool:
    """True if the date from relative expression (e.g., '1mo ago') is within tolerance of expected_date.
    
    Also accepts exact date matches as fallback.
    """
    # First try exact date match
    if date_match(agent_answer, expected_date):
        return True
    
    # Try relative date parsing
    parsed = parse_relative_date(agent_answer)
    if parsed is None:
        return False
    
    # Check if within tolerance
    diff_days = abs((parsed - expected_date).days)
    return diff_days <= tolerance_days


_RELATIVE_TIME_PATTERN = re.compile(
    r"(\d+)\s*(m|h|d|w|mo|month|week|day|hour|minute)s?\s*ago",
    re.IGNORECASE
)


def parse_relative_time(text: str) -> Optional[datetime.date]:
    """Parse relative time expressions like '2 weeks ago' or '1mo ago' into a date.
    
    >>> parse_relative_time("2 weeks ago")  # doctest: +SKIP
    datetime.date(...)
    """
    match = _RELATIVE_TIME_PATTERN.search(text)
    if not match:
        return None
    
    amount = int(match.group(1))
    unit = match.group(2).lower()
    
    now = datetime.datetime.now()
    
    if unit in ('m', 'minute'):
        delta = datetime.timedelta(minutes=amount)
    elif unit in ('h', 'hour'):
        delta = datetime.timedelta(hours=amount)
    elif unit in ('d', 'day'):
        delta = datetime.timedelta(days=amount)
    elif unit in ('w', 'week'):
        delta = datetime.timedelta(weeks=amount)
    elif unit in ('mo', 'month'):
        # Approximate: 30 days per month
        delta = datetime.timedelta(days=amount * 30)
    else:
        return None
    
    past_date = now - delta
    return past_date.date()


def flexible_date_match(agent_answer: str, expected_date: datetime.date, tolerance_days: int = 3) -> bool:
    """True if the date in *agent_answer* matches *expected_date* within tolerance.
    
    Handles both exact dates and relative time expressions like '2 weeks ago'.
    The tolerance allows for rounding in relative time (e.g., "1mo ago" could be 28-32 days).
    """
    # Try exact date match first
    parsed_exact = extract_date(agent_answer)
    if parsed_exact:
        diff = abs((parsed_exact - expected_date).days)
        return diff <= tolerance_days
    
    # Try relative time match
    parsed_relative = parse_relative_time(agent_answer)
    if parsed_relative:
        diff = abs((parsed_relative - expected_date).days)
        return diff <= tolerance_days
    
    return False

def date_match(agent_answer: str, expected_date: datetime.date, tolerance_days: int = 1) -> bool:
    """True if the date extracted from *agent_answer* is within
    *tolerance_days* of *expected_date*.  Tolerance accounts for
    imprecision in relative expressions like '3 weeks ago'."""
    parsed = extract_date(agent_answer)
    if parsed is None:
        return False
    return abs((parsed - expected_date).days) <= tolerance_days


# ---------------------------------------------------------------------------
# Time-of-day matching
# ---------------------------------------------------------------------------

_TIME_12H = re.compile(r"(\d{1,2}):(\d{2})\s*(am|pm)", re.IGNORECASE)
_TIME_24H = re.compile(r"\b(\d{1,2}):(\d{2})\b")


def extract_time(text: str) -> Optional[datetime.time]:
    """Parse a time from *text*.  Tries 12-hour then 24-hour formats."""
    m = _TIME_12H.search(text)
    if m:
        hour, minute, ampm = int(m.group(1)), int(m.group(2)), m.group(3).lower()
        if ampm == "pm" and hour != 12:
            hour += 12
        elif ampm == "am" and hour == 12:
            hour = 0
        return datetime.time(hour, minute)

    m = _TIME_24H.search(text)
    if m:
        hour, minute = int(m.group(1)), int(m.group(2))
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return datetime.time(hour, minute)

    return None


def time_match(agent_answer: str, expected_time: datetime.time, tolerance_minutes: int = 1) -> bool:
    """True if the extracted time is within *tolerance_minutes* of *expected_time*."""
    parsed = extract_time(agent_answer)
    if parsed is None:
        return False
    parsed_minutes = parsed.hour * 60 + parsed.minute
    expected_minutes = expected_time.hour * 60 + expected_time.minute
    return abs(parsed_minutes - expected_minutes) <= tolerance_minutes


# ---------------------------------------------------------------------------
# Date matching
# ---------------------------------------------------------------------------

def date_match(agent_answer: str, date_str, allow_day_offset: int = 1) -> bool:
    """True if *date_str* matches a date expressed in the agent's free-text answer.

    *date_str* may be an ISO format string (``"2025-10-31"`` or a full ISO
    timestamp) **or** a ``datetime.date`` object.

    Handles:
    - ISO numeric:   "2025-10-31", "10/31/2025", "10/31/25"
    - Long month:    "October 31, 2025", "31 October 2025"
    - Short month:   "Oct 31, 2025",    "31 Oct 2025",  "Oct 31 2025"
    - Timezone drift: checks ±*allow_day_offset* days so UTC timestamps that
      display as the next calendar day in local time still match.
    """
    try:
        if isinstance(date_str, datetime.date):
            expected = date_str
        else:
            date_part = date_str[:10]
            expected = datetime.date.fromisoformat(date_part)
    except (ValueError, TypeError):
        return substring_match(agent_answer, str(date_str))

    lower = agent_answer.lower()

    # Check the expected date and neighboring days (timezone tolerance)
    for delta in range(-allow_day_offset, allow_day_offset + 1):
        d = expected + datetime.timedelta(days=delta)
        # ISO numeric forms
        if d.strftime("%Y-%m-%d") in lower:
            return True
        if d.strftime("%-m/%-d/%Y") in lower or d.strftime("%m/%d/%Y") in lower:
            return True
        if d.strftime("%-m/%-d/%y") in lower or d.strftime("%m/%d/%y") in lower:
            return True
        # Long month name
        if d.strftime("%B %-d, %Y").lower() in lower or d.strftime("%B %d, %Y").lower() in lower:
            return True
        if d.strftime("%-d %B %Y").lower() in lower or d.strftime("%d %B %Y").lower() in lower:
            return True
        # Short month name
        if d.strftime("%b %-d, %Y").lower() in lower or d.strftime("%b %d, %Y").lower() in lower:
            return True
        if d.strftime("%-d %b %Y").lower() in lower or d.strftime("%d %b %Y").lower() in lower:
            return True
        if d.strftime("%b %-d %Y").lower() in lower or d.strftime("%b %d %Y").lower() in lower:
            return True

    return False

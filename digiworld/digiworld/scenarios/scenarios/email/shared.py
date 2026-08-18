# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for email scenario instance generation.

Provides LLM prompts/models, mockdata record builders, and constraint
declarations reused across all email scenarios.
"""

import re
from typing import Any, Dict, List, Union

from pydantic import BaseModel

from digiworld.scenarios.builders import derive_email_from_name, write_mockdata
from digiworld.scenarios.constraints import DataVolumeConstraint


# ======================================================================
# Unicode sanitization
# ======================================================================

_UNICODE_REPLACEMENTS = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u2011": "-",
    "\u2010": "-",
    "\u202f": " ",
    "\u00a0": " ",
    "\u2026": "...",
}


def sanitize_text(text: str) -> str:
    """Replace common Unicode punctuation with ASCII equivalents."""
    for src, dst in _UNICODE_REPLACEMENTS.items():
        text = text.replace(src, dst)
    return text


def sanitize_parsed(obj: Union[str, list, dict, Any]) -> Any:
    """Recursively sanitize all strings in a parsed JSON structure."""
    if isinstance(obj, str):
        return sanitize_text(obj)
    if isinstance(obj, list):
        return [sanitize_parsed(item) for item in obj]
    if isinstance(obj, dict):
        return {k: sanitize_parsed(v) for k, v in obj.items()}
    return obj


# ======================================================================
# Shared prompt fragments
# ======================================================================

LLM_TEXT_RULES = (
    "IMPORTANT: Use ONLY plain ASCII characters in ALL generated text. "
    "Do NOT use curly/smart quotes, en-dashes, em-dashes, non-breaking "
    "hyphens, or any other Unicode punctuation. Use only straight "
    "apostrophes ('), regular hyphens (-), and standard spaces. "
    "Do NOT use the name Liam O'Connor or any variant, and avoid "
    "names containing 'Liam' or 'O'Connor'. "
    "Do NOT address email bodies to a specific first name (avoid "
    "'Hey Alex', 'Dear Sarah', etc.) -- use 'Hi', 'Hello', 'Hi there', "
    "or 'Hi team' instead."
)


def _sanitize_thread_id(prefix: str, text: str, max_len: int = 40) -> str:
    """Build a filesystem/DB-safe thread ID from free-text."""
    slug = re.sub(r"[^a-z0-9]+", "_", text[:max_len].lower()).strip("_")
    return f"{prefix}_{slug}" if slug else f"{prefix}_unnamed"


# ======================================================================
# LLM prompts and Pydantic models
# ======================================================================

class EmailBatch(BaseModel):
    subjects: List[str]
    bodies: List[str]
    senders: List[str]


class RecipientBatch(BaseModel):
    names: List[str]
    emails: List[str]


def email_batch_prompt(context: str, count: int) -> str:
    return (
        f"Generate exactly {count} realistic {context} emails. "
        f"For each email, provide a subject line, a 2-3 sentence body "
        f"that is coherent with the subject, and a sender full name. "
        f"Ensure variety in topics and senders. "
        f"Return JSON with keys 'subjects', 'bodies', 'senders' as "
        f"parallel arrays of strings."
    )


def recipient_batch_prompt(context: str, count: int) -> str:
    return (
        f"Generate exactly {count} realistic {context} email recipients. "
        f"For each, provide a full name and an email address. "
        f"Ensure variety in names and domains. "
        f"Return JSON with keys 'names' and 'emails' as parallel arrays."
    )


# ======================================================================
# Mockdata record builders
# ======================================================================

def email_record(
    sender_name: str,
    subject: str,
    body: str,
    folder: str = "inbox",
    timestamp: str = "{{recent_timestamp}}",
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a single email mockdata record with template placeholders."""
    sender_email = derive_email_from_name(sender_name)
    record = {
        "id": "{{auto_id}}",
        "sender": sender_email,
        "receiver": ["{{current_user_email}}"],
        "subject": subject,
        "preview": body[:50] + "..." if body else subject[:30] + "...",
        "body": body,
        "timestamp": timestamp,
        "unread": 1,
        "read": 0,
        "status": "received",
        "attachments": [],
        "labels": [],
        "isDraft": 0,
        "threadId": _sanitize_thread_id("thread", f"{sender_name}_{subject}"),
        "folder": folder,
        "priority": "normal",
        "cc": [],
        "bcc": [],
    }
    record.update(overrides)
    return record


def draft_email_record(
    recipient_email: str,
    subject: str,
    body: str = "",
    timestamp: str = "{{recent_timestamp}}",
    cc: list | None = None,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a single draft email mockdata record with template placeholders."""
    record = {
        "id": "{{auto_id}}",
        "sender": "{{current_user_email}}",
        "receiver": [recipient_email],
        "subject": subject,
        "preview": body[:50] + "..." if body else subject[:30] + "...",
        "body": body,
        "timestamp": timestamp,
        "unread": 0,
        "read": 0,
        "status": "draft",
        "attachments": [],
        "labels": [],
        "isDraft": 1,
        "threadId": _sanitize_thread_id("draft", subject),
        "folder": "draft",
        "priority": "normal",
        "cc": cc or [],
        "bcc": [],
    }
    record.update(overrides)
    return record


# ======================================================================
# Constraint declarations
# ======================================================================

INBOX_HAS_EMAILS = DataVolumeConstraint(
    table="emails", filter={"folder": "inbox", "status": "received"}, min_count=3
)

DRAFTS_EXIST = DataVolumeConstraint(
    table="emails", filter={"folder": "draft"}, min_count=1
)

SENT_EMAILS_EXIST = DataVolumeConstraint(
    table="emails", filter={"folder": "sent", "status": "sent"}, min_count=1
)

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for message scenario instance generation."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata
from digiworld.scenarios.constraints import DataVolumeConstraint, EntityExistsConstraint


class ContactNameBatch(BaseModel):
    names: List[str]


class GroupNameBatch(BaseModel):
    names: List[str]
    descriptions: List[str]


class GreetingBatch(BaseModel):
    greetings: List[str]


def contact_name_prompt(context: str, count: int) -> str:
    return (
        f"Generate exactly {count} realistic full person names for "
        f"contacts in a messaging app. Context: {context}. "
        f"Include diverse genders and cultural backgrounds. "
        f"Return JSON with key 'names' as a list of strings."
    )


def message_user_record(
    name: str, user_id: str = "contact-10001", **overrides: Any
) -> Dict[str, Any]:
    record = {
        "id": user_id,
        "phoneNumber": "{{random_phone}}",
        "name": name,
        "avatarUrl": None,
        "lastLoggedIn": 0,
    }
    record.update(overrides)
    return record


def message_record(
    sender_id: str = "{{current_user_id}}",
    receiver_id: str = "contact-10001",
    content: str = "{{casual_message}}",
    message_type: str = "text",
    timestamp: str = "{{recent_message_time}}",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "senderId": sender_id,
        "receiverId": receiver_id,
        "messageType": message_type,
        "content": content,
        "timestamp": timestamp,
        "isRead": 1,
        "isDelivered": 1,
    }
    record.update(overrides)
    return record


def group_record(
    name: str,
    description: str = "",
    created_by: str = "{{current_user_id}}",
    group_id: str = "injected-group-001",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": group_id,
        "name": name,
        "description": description,
        "avatarUrl": None,
        "createdBy": created_by,
        "createdAt": "{{recent_message_time}}",
        "isActive": 1,
        "deletedBy": None,
    }
    record.update(overrides)
    return record


def group_member_record(
    group_id: str = "injected-group-001",
    user_id: str = "{{current_user_id}}",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "groupId": group_id,
        "userId": user_id,
        "exitedAt": None,
    }
    record.update(overrides)
    return record


def group_message_record(
    group_id: str = "injected-group-001",
    sender_id: str = "{{current_user_id}}",
    content: str = "{{casual_message}}",
    message_type: str = "text",
    timestamp: str = "{{recent_message_time}}",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "groupId": group_id,
        "senderId": sender_id,
        "messageType": message_type,
        "content": content,
        "timestamp": timestamp,
        "isReadBy": None,
        "isDeliveredTo": None,
        "deletedBy": None,
    }
    record.update(overrides)
    return record


MEMBER_NAME_POOLS: Dict[str, List[tuple]] = {
    "friends": [
        ("friend-001", "Maya Rodriguez"),
        ("friend-002", "Kai Bennett"),
        ("friend-003", "Zara Williams"),
    ],
    "work": [
        ("coworker-001", "David Park"),
        ("coworker-002", "Sarah Mitchell"),
        ("coworker-003", "James Okonkwo"),
    ],
    "family": [
        ("family-001", "Elena Sharma"),
        ("family-002", "Marcus Johnson"),
        ("family-003", "Lily Chen"),
    ],
}

GROUP_DESCRIPTIONS: Dict[str, str] = {
    "friends": "Our hangout spot for catching up and making plans.",
    "work": "Team coordination and project updates.",
    "family": "Family news, photos, and event planning.",
}


def call_history_record(
    caller_id: str = "{{current_user_id}}",
    receiver_id: str = "contact-10001",
    call_type: str = "voice",
    duration: int = 120,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a call_history record.

    Set ``duration > 0`` for a completed call that the verifier can
    detect.  The verifier checks ``duration > 0`` to confirm the call
    happened.
    """
    import time
    record = {
        "id": "{{auto_id}}",
        "callerId": caller_id,
        "receiverId": receiver_id,
        "callType": call_type,
        "duration": duration,
        "timestamp": int(time.time()),
        "wasMissed": 0,
    }
    record.update(overrides)
    return record


HAS_MESSAGES = DataVolumeConstraint(
    table="messages",
    min_count=1,
    filter={"sender_id": "1"},
)

HAS_CHAT_SETTINGS = EntityExistsConstraint(
    table="chat_settings",
    min_count=1,
    user_filter=True,
)

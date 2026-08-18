# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared test fixtures for email scenario unit tests.

Provides in-memory SQLite database setup matching the email app's Drizzle
schema, along with helpers for creating rootstore state and stub scenarios.
"""

import json
import os
import sqlite3
import tempfile
from typing import Any, Dict, List, Optional

from digiworld.scenarios.state_manager import StateManager


EMAIL_SCHEMA_SQL = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT,
    avatar TEXT,
    phone_number TEXT,
    date_of_birth TEXT,
    role TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%%H:%%M:%%fZ', 'now')),
    settings TEXT NOT NULL,
    email_settings TEXT NOT NULL
);

CREATE TABLE emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    subject TEXT,
    preview TEXT,
    body TEXT,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%%H:%%M:%%fZ', 'now')),
    unread INTEGER NOT NULL DEFAULT 1,
    read INTEGER NOT NULL DEFAULT 0,
    status TEXT,
    attachments TEXT,
    labels TEXT,
    is_draft INTEGER NOT NULL DEFAULT 0,
    thread_id TEXT,
    folder TEXT,
    priority TEXT,
    cc TEXT,
    bcc TEXT
);
"""

DEFAULT_USER_SETTINGS = json.dumps({
    "theme": "light",
    "language": "English",
    "notifications": True,
    "twoFactorEnabled": False,
})

DEFAULT_EMAIL_SETTINGS = json.dumps({
    "signature": "",
    "emailsPerPage": 25,
    "autoReadReceipts": False,
    "defaultReplyTo": "",
    "vacationAutoReplyEnabled": False,
    "vacationAutoReplyMessage": "",
})

DEFAULT_USER = (
    1,
    "liam.oconnor@gmail.co.uk",
    "password123",
    "Liam",
    "O'Connor",
    "Liam O'Connor",
    None,
    "+441234567890",
    "1990-01-15",
    "user",
    "2024-01-01T00:00:00.000Z",
    DEFAULT_USER_SETTINGS,
    DEFAULT_EMAIL_SETTINGS,
)


def create_state_dir(
    emails: List[Dict[str, Any]],
    user: tuple = DEFAULT_USER,
    rootstore: Optional[Dict] = None,
) -> str:
    """Create a temp state directory with a populated SQLite DB and rootstore.

    Returns the absolute path to the state directory.
    """
    tmpdir = tempfile.mkdtemp()
    state_dir = os.path.join(tmpdir, "state")
    os.makedirs(state_dir)

    db_name = os.path.basename(state_dir)
    db_path = os.path.join(state_dir, f"{db_name}.db")
    conn = sqlite3.connect(db_path)
    conn.executescript(EMAIL_SCHEMA_SQL)
    conn.execute(
        "INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        user,
    )
    for em in emails:
        conn.execute(
            """INSERT INTO emails
            (id, sender, receiver, subject, preview, body, timestamp,
             unread, read, status, attachments, labels, is_draft,
             thread_id, folder, priority, cc, bcc)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                em["id"],
                em["sender"],
                json.dumps(em.get("receiver", [])),
                em.get("subject", ""),
                em.get("preview", ""),
                em.get("body", ""),
                em.get("timestamp", "2026-01-15T10:00:00.000Z"),
                em.get("unread", 1),
                em.get("read", 0),
                em.get("status", "received"),
                json.dumps(em.get("attachments", [])),
                json.dumps(em.get("labels", [])),
                em.get("is_draft", 0),
                em.get("thread_id", f"thread_{em['id']}"),
                em.get("folder", "inbox"),
                em.get("priority", "normal"),
                json.dumps(em.get("cc", [])),
                json.dumps(em.get("bcc", [])),
            ),
        )
    conn.commit()
    conn.close()

    if rootstore is None:
        rootstore = build_rootstore()
    rs_path = os.path.join(state_dir, "rootstore.json")
    with open(rs_path, "w") as f:
        json.dump(rootstore, f)

    return state_dir


def build_rootstore(
    screen_name: str = "inbox",
    route: str = "/(tabs)/inbox",
    form_data: Optional[Dict] = None,
    session_data: Optional[Dict] = None,
) -> Dict:
    sd = session_data or {}
    if form_data:
        sd["formData"] = form_data
    return {
        "sessionStore": {
            "session": {
                "id": "default",
                "data": {
                    "screenName": screen_name,
                    "route": route,
                    "sessionData": sd,
                },
            }
        },
        "userStore": {
            "currentUser": {
                "id": 1,
                "email": "liam.oconnor@gmail.co.uk",
                "firstName": "Liam",
                "lastName": "O'Connor",
                "displayName": "Liam O'Connor",
            },
            "authToken": "dummy-token-1",
        },
    }


def make_stub(scenario_class):
    """Create a stub instance of a scenario class, bypassing __init__."""

    class Stub(scenario_class):
        def __init__(self):
            pass

    stub = Stub()
    stub.current_user_id = 1
    stub.current_user_email = "liam.oconnor@gmail.co.uk"
    stub._state_manager = StateManager(stub)
    return stub

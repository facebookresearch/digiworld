# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for payment scenario instance generation."""

import json
import random as _random
from typing import Any, Dict, List

from pydantic import BaseModel

from digiworld.scenarios.builders import derive_email_from_name, write_mockdata
from digiworld.scenarios.constraints import BalanceConstraint


# ======================================================================
# LLM prompts and Pydantic models
# ======================================================================

class NicknameBatch(BaseModel):
    nicknames: List[str]
    first_names: List[str]
    last_names: List[str]
    descriptions: List[str]


def nickname_batch_prompt(context: str, count: int) -> str:
    return (
        f"Generate exactly {count} realistic contacts for a {context} context "
        f"in a payment app. For each, provide:\n"
        f"- A nickname (1-2 words, like 'BestFriend' or 'Mom')\n"
        f"- A realistic first name for the contact (e.g., 'Sarah')\n"
        f"- A realistic last name for the contact (e.g., 'Johnson')\n"
        f"- A typical payment description (e.g., 'Dinner split', 'Birthday gift')\n"
        f"Ensure variety in names and nicknames. All names must be unique. "
        f"Return JSON with keys 'nicknames', 'first_names', 'last_names', "
        f"'descriptions' as parallel arrays of strings."
    )


class PinBatch(BaseModel):
    pins: List[str]


def pin_batch_prompt(count: int) -> str:
    return (
        f"Generate exactly {count} realistic 4-digit PIN codes that a user "
        f"might set for a payment app. They should be memorable but not "
        f"trivially obvious (avoid 0000, 1234). "
        f"Return JSON with key 'pins' as a list of 4-character digit strings."
    )


# ======================================================================
# Amount ranges by context
# ======================================================================

AMOUNT_RANGES = {
    "friends": [(5, 30), (25, 100), (50, 300)],
    "family": [(10, 50), (100, 500), (500, 2000)],
    "work": [(50, 200), (500, 1500), (1000, 3000)],
}

LIMIT_RANGES = {
    "small": (100, 500),
    "medium": (500, 2000),
    "large": (2000, 10000),
}

MONTHLY_LIMIT_RANGES = {
    "small": (3000, 15000),
    "medium": (15000, 60000),
    "large": (60000, 300000),
}


def random_amount(context: str, rng: _random.Random) -> float:
    ranges = AMOUNT_RANGES.get(context, [(10, 100)])
    lo, hi = rng.choice(ranges)
    return round(rng.uniform(lo, hi), 2)


# ======================================================================
# Mockdata record builders
# ======================================================================

def contact_record(
    nickname: str,
    contact_user_id: int = 10001,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "contactUserId": contact_user_id,
        "nickname": nickname,
        "favorite": 1,
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{past_timestamp}}",
    }
    record.update(overrides)
    return record


def wallet_record(balance: float, **overrides: Any) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "balance": round(balance, 2),
        "currency": "USD",
        "type": "personal",
        "status": "active",
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{past_timestamp}}",
    }
    record.update(overrides)
    return record


def user_record_for_contact(
    first_name: str,
    last_name: str,
    email: str,
    user_id: int = 10001,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": user_id,
        "email": email,
        "password": "hashed_placeholder",
        "pin": "5678",
        "pinAttempts": 0,
        "pinLockedUntil": None,
        "firstName": first_name,
        "lastName": last_name,
        "phoneNumber": "{{random_phone}}",
        "settings": "{}",
        "kycVerified": 1,
        "status": "active",
        "dailyLimit": 5000.0,
        "monthlyLimit": 50000.0,
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{past_timestamp}}",
    }
    record.update(overrides)
    return record


def transaction_record(
    sender_wallet_id: int,
    receiver_wallet_id: int,
    amount: float,
    tx_type: str = "transfer",
    reference: str = "txn_mock_99001",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "senderWalletId": sender_wallet_id,
        "receiverWalletId": receiver_wallet_id,
        "amount": round(amount, 2),
        "currency": "USD",
        "status": "completed",
        "type": tx_type,
        "pinVerified": 1,
        "pinVerifiedAt": "{{recent_timestamp}}",
        "reference": reference,
        "description": "Payment transfer",
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record


# ======================================================================
# Constraint declarations
# ======================================================================

WALLET_HAS_BALANCE = BalanceConstraint(
    table="wallets",
    field="balance",
    user_filter=True,
    min_value=lambda params: float(params.get("amount", 0)),
)

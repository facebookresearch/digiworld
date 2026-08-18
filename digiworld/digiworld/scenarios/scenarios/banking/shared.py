# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for banking scenario instance generation."""

from typing import Any, Dict, List

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata


class TransactionDescBatch(BaseModel):
    descriptions: List[str]
    memos: List[str]


TRANSACTION_TYPES = {
    "transfer": 1,
    "bill_payment": 2,
    "zelle": 3,
    "external_transfer": 4,
    "deposit": 5,
    "withdrawal": 6,
    "purchase": 7,
    "credit_card_payment": 8,
    "interest_charge": 9,
    "monthly_fee": 10,
}

ACCOUNT_TYPES = {
    "checking": 1,
    "savings": 2,
    "money_market": 3,
    "ira_account": 4,
}


def transaction_batch_prompt(tx_type: str, count: int) -> str:
    return (
        f"Generate exactly {count} realistic bank transaction descriptions "
        f"and memos for {tx_type} transactions. "
        f"Descriptions should be specific (e.g., 'Monthly Salary Deposit', "
        f"'Grocery Store Purchase'). Memos should be a short sentence. "
        f"Ensure variety. Return JSON with keys 'descriptions' and 'memos' "
        f"as parallel arrays."
    )


def transaction_record(
    description: str,
    memo: str,
    tx_type: str,
    rng: Any,
    **overrides: Any,
) -> Dict[str, Any]:
    type_id = TRANSACTION_TYPES.get(tx_type, 1)
    amount = round(rng.uniform(50, 5000), 2)
    balance_before = round(rng.uniform(max(amount * 1.5, 1000), 50000), 2)
    if tx_type == "deposit":
        balance_after = round(balance_before + amount, 2)
    else:
        balance_after = round(balance_before - amount, 2)

    from_acct, to_acct = None, None

    record = {
        "id": "{{auto_id}}",
        "sessionId": None,
        "transactionTypeId": type_id,
        "userId": "{{current_user_id}}",
        "fromAccountId": from_acct,
        "toAccountId": to_acct,
        "billerId": None,
        "billId": None,
        "beneficiaryId": None,
        "zelleContactId": None,
        "creditCardId": None,
        "debitCardId": None,
        "amount": amount,
        "fee": 0.0,
        "balanceBefore": round(balance_before, 2),
        "balanceAfter": round(balance_after, 2),
        "referenceId": f"REF-{rng.randint(10000, 99999)}",
        "confirmationNumber": f"CONF-{rng.randint(10000, 99999)}",
        "description": description,
        "memo": memo,
        "day": 1,
        "transactionDate": "{{middle_timestamp}}",
        "postedDate": "{{middle_timestamp}}",
        "pendingUntil": None,
        "status": "success",
        "failureReason": None,
        "errorCode": None,
        "errorMessage": None,
        "metadata": None,
        "createdAt": "{{middle_timestamp}}",
    }
    record.update(overrides)
    return record


def zelle_contact_record(
    contact_name: str,
    contact_email: str,
    is_favorite: int = 0,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "contactName": contact_name,
        "contactEmail": contact_email,
        "contactPhone": "{{random_phone}}",
        "isEnrolled": 1,
        "isFavorite": is_favorite,
        "lastSentAmount": None,
        "lastSentDate": None,
        "createdAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record


def bill_record(
    biller_id: int,
    amount: float,
    due_date: str,
    status: str = "pending",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "billerId": biller_id,
        "accountId": None,
        "billNumber": None,
        "amount": amount,
        "dueDate": due_date,
        "dueDay": None,
        "isRecurring": 0,
        "recurrenceInterval": 30,
        "nextDueDate": None,
        "autoPayEnabled": 0,
        "autoPayAccountId": None,
        "minimumPaymentAmount": None,
        "status": status,
        "paidDate": None,
        "paidAmount": None,
        "lateFee": 0.0,
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record


def credit_card_record(
    last_four: str,
    balance: float,
    credit_limit: float = 10000.0,
    **overrides: Any,
) -> Dict[str, Any]:
    available = round(credit_limit - balance, 2)
    card_prefix = "453201827693"
    card_number = f"{card_prefix}{last_four}"
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "linkedCheckingAccountId": None,
        "cardNumber": card_number,
        "lastFourDigits": last_four,
        "cardholderName": "{{current_user_name}}",
        "expiryMonth": 12,
        "expiryYear": 2028,
        "cvv": "321",
        "creditLimit": credit_limit,
        "currentBalance": balance,
        "availableCredit": available,
        "apr": 19.99,
        "annualFee": 0.0,
        "cashAdvanceFeePercent": 5.0,
        "latePaymentFee": 35.0,
        "paymentDueDay": 15,
        "minimumPaymentPercent": 2.0,
        "statementClosingDay": 1,
        "autopayEnabled": 0,
        "autopayAmount": "minimum",
        "status": "active",
        "openedDate": "{{past_timestamp}}",
        "lastPaymentDate": None,
        "lastStatementDate": None,
        "createdAt": "{{past_timestamp}}",
    }
    record.update(overrides)
    return record


def account_record(
    account_name: str,
    account_type_id: int,
    balance: float,
    rng: Any,
    **overrides: Any,
) -> Dict[str, Any]:
    acct_num = str(rng.randint(1000000000, 9999999999))
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "accountTypeId": account_type_id,
        "accountNumber": acct_num,
        "accountName": account_name,
        "balance": balance,
        "availableBalance": balance,
        "isPrimary": 0,
        "status": "active",
        "openedDate": "{{past_timestamp}}",
        "closedDate": None,
        "lastStatementDate": None,
        "nextStatementDate": None,
        "overdraftProtectionEnabled": 0,
        "overdraftProtectionSourceAccountId": None,
        "linkedSavingsAccountId": None,
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{past_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record


def biller_record(
    name: str,
    code: str,
    category: str,
    rng: Any,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "code": code,
        "name": name,
        "category": category,
        "subcategory": None,
        "description": f"Payment to {name}",
        "logoUrl": None,
        "website": None,
        "phone": "{{random_phone}}",
        "address": None,
        "isSearchable": 1,
        "searchSuccessRate": 1.0,
        "requiresAccountNumber": 1,
        "acceptsCreditCard": 1,
        "acceptsBankAccount": 1,
        "minPaymentAmount": 1.0,
        "averageBillAmount": round(rng.uniform(50, 500), 2),
        "paymentProcessingDays": 1,
        "isActive": 1,
        "createdAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record


def scheduled_transaction_record(
    amount: float,
    scheduled_date: str,
    description: str,
    memo: str = "",
    tx_type_id: int = 4,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "transactionTypeId": tx_type_id,
        "fromAccountId": None,
        "toAccountId": None,
        "billerId": None,
        "beneficiaryId": None,
        "amount": amount,
        "scheduledDate": scheduled_date,
        "isRecurring": 0,
        "recurrenceFrequency": None,
        "recurrenceEndDate": None,
        "description": description,
        "memo": memo,
        "status": "scheduled",
        "processedTransactionId": None,
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record

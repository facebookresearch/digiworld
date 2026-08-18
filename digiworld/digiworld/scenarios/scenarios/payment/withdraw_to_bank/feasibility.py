# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for withdraw_to_bank.

The user's wallet must have sufficient balance for the withdrawal amount.
"""

from digiworld.scenarios.scenarios.payment.shared import WALLET_HAS_BALANCE

CONSTRAINTS = [WALLET_HAS_BALANCE]

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for reply-and-report-sent.

Same as reply_to_most_recent_from: requires inbox emails to exist.
"""

from digiworld.scenarios.scenarios.email.shared import INBOX_HAS_EMAILS

CONSTRAINTS = [INBOX_HAS_EMAILS]

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Add address and order'.

The address is being added by the task. The order requires the restaurant
to exist (injected via mockdata). No pre-existing address constraint
because the task itself adds one.
"""

CONSTRAINTS = []

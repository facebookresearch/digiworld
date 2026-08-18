# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Set default address'.

Requires at least two addresses so there is a non-default address to promote.
"""

from digiworld.scenarios.scenarios.ecommerce.shared import HAS_MULTIPLE_ADDRESSES

CONSTRAINTS = [HAS_MULTIPLE_ADDRESSES]

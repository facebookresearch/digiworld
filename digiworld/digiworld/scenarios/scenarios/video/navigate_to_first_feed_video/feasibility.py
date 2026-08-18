# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for navigate_to_first_feed_video."""

from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(
        table="videos",
        min_count=5,
        filter={"status": "active", "visibility": "public"},
    ),
]

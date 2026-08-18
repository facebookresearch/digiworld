# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'How many <metric> do I have?'."""

from digiworld.scenarios.scenarios.video.shared import (
    CHANNEL_EXISTS_FOR_USER,
    PLAYLISTS_EXIST_FOR_USER,
)

CONSTRAINTS = [CHANNEL_EXISTS_FOR_USER, PLAYLISTS_EXIST_FOR_USER]

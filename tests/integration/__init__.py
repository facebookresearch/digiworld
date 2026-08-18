# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Integration tests for digiworld.

These tests require a real Android emulator connected via ADB or Genymotion.

To run:
    pytest tests/integration/ -v

To run with Genymotion backend:
    EMULATOR_BACKEND=genymotion pytest tests/integration/ -v
"""
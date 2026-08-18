# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for stop schedule extreme arrival queries."""

from digiworld.scenarios.scenarios.transit.shared import STOPS_EXIST, VEHICLES_EXIST

CONSTRAINTS = [STOPS_EXIST, VEHICLES_EXIST]

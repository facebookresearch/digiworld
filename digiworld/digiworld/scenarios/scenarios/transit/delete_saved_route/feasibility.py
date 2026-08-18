# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Delete the saved route <route_name>'."""

# No pre-injection constraints needed: the saved route is injected via
# mockdata (mock-saved_routes.json), so it doesn't need to exist in the
# profile's initial state.
CONSTRAINTS = []

# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario

_DELETED_STATUSES = {"cancelled", "ended", "closed", "deleted", "removed"}


class DeleteListingScenario(AuctionScenario, TargetStateScenario):
    """Scenario for deleting a listing."""

    def _check_task_completion(self, state_path):
        query = "SELECT status FROM items WHERE LOWER(title) = LOWER(?)"
        results = self._execute_query_in_path(query, (self.title,), state_path)

        if not results:
            # Row was hard-deleted from the database -- that counts as deleted
            return True

        return results[0][0].lower() in _DELETED_STATUSES

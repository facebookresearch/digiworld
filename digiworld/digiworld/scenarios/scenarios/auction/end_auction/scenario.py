# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class EndAuctionScenario(AuctionScenario, TargetStateScenario):
    """Scenario for ending an active auction."""

    def _check_task_completion(self, state_path):
        query = "SELECT status, expired FROM items WHERE LOWER(title) = LOWER(?)"
        results = self._execute_query_in_path(query, (self.title,), state_path)

        if not results:
            raise ValueError(
                f"Auction item with title '{self.title}' not found in database"
            )

        status, expired = results[0][0], results[0][1]
        return status == "expired" and expired == 1

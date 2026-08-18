# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class ToggleTransactionSuccessOffScenario(AuctionScenario, TargetStateScenario):
    """Scenario for toggling the transaction success system config to off."""

    def _check_task_completion(self, state_path):
        config_query = "SELECT value FROM system_config WHERE key = ?"
        config_results = self._execute_query_in_path(
            config_query, ("transactions_succeed",), state_path
        )
        if not config_results:
            return False

        return str(config_results[0][0]).lower() == "false"

# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class ToggleTransactionSuccessOnScenario(AuctionScenario, TargetStateScenario):
    """Scenario for toggling the transaction success system config to on."""

    def _check_task_completion(self, state_path):
        config_query = "SELECT value FROM system_config WHERE key = ?"

        # Precondition: transaction success must NOT already be toggled on
        initial_config = self._execute_query_in_path(
            config_query, ("transactions_succeed",), self.initial_state_path
        )
        already_on = (
            initial_config
            and str(initial_config[0][0]).lower() == "true"
        )
        if already_on:
            raise ValueError(
                "Transaction success was already toggled on in initial state "
                "— vacuous truth"
            )

        config_results = self._execute_query_in_path(
            config_query, ("transactions_succeed",), state_path
        )
        if not config_results:
            return False

        return str(config_results[0][0]).lower() == "true"

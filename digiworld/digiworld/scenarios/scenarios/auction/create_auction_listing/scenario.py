# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class CreateAuctionListingScenario(AuctionScenario, TargetStateScenario):
    """Scenario for creating a new auction listing."""

    def _check_task_completion(self, state_path):
        query = "SELECT id, title, auction_flag, starting_bid FROM items WHERE seller_id = ?"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        if not new_records:
            return False

        try:
            target_bid = float(self.startbid)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid startbid parameter: {self.startbid}")

        for record in new_records:
            db_title = record[1]
            auction_flag = record[2]
            starting_bid = record[3]

            title_expected = self.title.lower()
            title_actual = db_title.lower()
            if title_expected not in title_actual and title_actual not in title_expected:
                continue
            if auction_flag != 1:
                continue
            if starting_bid is None:
                continue

            tolerance = max(1.0, target_bid * 0.05)
            if abs(starting_bid - target_bid) <= tolerance:
                return True

        return False

# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class CreateBuynowListingScenario(AuctionScenario, TargetStateScenario):
    """Scenario for creating a new BuyNow listing."""

    def _check_task_completion(self, state_path):
        query = "SELECT id, title, auction_flag, price FROM items WHERE seller_id = ?"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        if not new_records:
            return False

        try:
            target_price = float(self.price)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid price parameter: {self.price}")

        for record in new_records:
            db_title = record[1]
            auction_flag = record[2]
            price = record[3]

            if db_title.lower() != self.title.lower():
                continue
            if auction_flag != 0:
                continue
            if price is None:
                continue

            tolerance = max(1.0, target_price * 0.05)
            if abs(price - target_price) <= tolerance:
                return True

        return False

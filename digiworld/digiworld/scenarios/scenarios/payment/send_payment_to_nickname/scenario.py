# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario


class SendPaymentToNicknameScenario(PaymentScenario, TargetStateScenario):
    """Scenario for sending a payment to a contact by nickname."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has sent a payment to the specified contact.
        
        This is verified by checking if a new completed transaction exists where:
        1. The sender is the current user
        2. The receiver is the contact with the specified nickname
        3. The amount matches the specified amount
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the payment was sent successfully, False otherwise.
        """
        
        # Use a JOIN query to find transactions to the contact with the specified nickname and amount
        # This approach is cleaner and matches the style of other scenarios
        query = """
        SELECT t.id, t.amount, t.status
        FROM transactions t
        JOIN wallets sender_wallet ON t.sender_wallet_id = sender_wallet.id
        JOIN wallets receiver_wallet ON t.receiver_wallet_id = receiver_wallet.id
        JOIN contacts c ON c.contact_user_id = receiver_wallet.user_id
        WHERE sender_wallet.user_id = ?
          AND c.user_id = ?
          AND c.nickname = ?
          AND t.amount = ?
          AND t.status = 'completed'
        ORDER BY t.created_at DESC
        """
        
        target_amount = float(self.amount)
        
        # Compare transactions between initial and current state
        initial_transactions, current_transactions, new_transactions = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_id, self.current_user_id, self.nickname, target_amount)
        )
        
        # Task completed if at least one new transaction was created
        return len(new_transactions) > 0


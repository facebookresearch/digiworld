# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for OpenReceivePaymentQRScenario."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.payment.open_receive_payment_qr.scenario import OpenReceivePaymentQRScenario


class TestOpenReceivePaymentQRScenario(unittest.TestCase):
    """Test cases for OpenReceivePaymentQRScenario."""
    
    def setUp(self):
        """Set up test fixtures with temporary directories."""
        self.temp_dir = tempfile.mkdtemp()
        self.initial_state_dir = os.path.join(self.temp_dir, "initial_state")
        self.final_state_dir = os.path.join(self.temp_dir, "final_state")
        os.makedirs(self.initial_state_dir)
        os.makedirs(self.final_state_dir)
        
        self._create_initial_state_json()
        self._create_final_state_json()
        
        self.scenario = self._create_test_scenario()
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_scenario(self):
        """Create scenario instance with test configuration."""
        scenario = OpenReceivePaymentQRScenario.__new__(OpenReceivePaymentQRScenario)
        return scenario
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITHOUT QR code modal."""
        rootstore_path = os.path.join(self.initial_state_dir, "rootstore.json")
        
        rootstore_data = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Home",
                        "route": "/(tabs)/home",
                        "sessionData": {
                            "formData": {
                                "showQRCode": False
                            }
                        }
                    }
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_state_json(self):
        """Create final rootstore.json WITH QR code modal open."""
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        
        rootstore_data = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Home",
                        "route": "/(tabs)/home",
                        "sessionData": {
                            "formData": {
                                "showQRCode": True
                            }
                        }
                    }
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when QR code is shown")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete without QR code shown")


if __name__ == '__main__':
    unittest.main()


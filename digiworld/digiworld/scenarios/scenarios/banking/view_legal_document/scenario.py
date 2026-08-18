# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import TargetStateScenario

logger = logging.getLogger(__name__)

DOCUMENT_SCREEN_MAP = {
    "terms & conditions": {"screens": ["terms"], "routes": ["/terms"]},
    "terms and conditions": {"screens": ["terms"], "routes": ["/terms"]},
    "privacy policy": {"screens": ["privacy"], "routes": ["/privacy"]},
}


class ViewLegalDocumentScenario(BankingScenario, TargetStateScenario):
    """Verify the user navigated to the correct legal document screen."""

    def _check_task_completion(self, state_path):
        document_type = getattr(self, "document_type", None)
        if not document_type:
            logger.warning("No document_type parameter found")
            return False

        doc_key = document_type.lower()
        mapping = DOCUMENT_SCREEN_MAP.get(doc_key)
        if mapping is None:
            logger.warning(f"Unknown document_type: '{document_type}'")
            return False

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False

        screen_name = current_session.get("data", {}).get("screenName", "").lower()
        route = current_session.get("data", {}).get("route", "").lower()

        screen_match = any(s in screen_name for s in mapping["screens"])
        route_match = any(r in route for r in mapping["routes"])

        result = screen_match or route_match
        logger.info(
            f"Legal document check: document_type='{document_type}', "
            f"screen='{screen_name}', route='{route}', result={result}"
        )
        return result

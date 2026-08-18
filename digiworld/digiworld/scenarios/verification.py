# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Verification logic for scenario trajectories."""

import logging
import os
from abc import abstractmethod
from typing import List, Dict
from digiworld.scenarios.scenario_base import Scenario

logger = logging.getLogger(__name__)


def _resolve_state_path(scenario: Scenario, state_path: str) -> str:
    """Resolve a state path that may be a bare session ID into an absolute
    filesystem path.  Callers (e.g. the evaluation pipeline) commonly pass
    session IDs rather than full paths; this ensures verification methods
    always receive a usable directory path.
    """
    if os.path.isabs(state_path):
        return state_path
    return scenario._state_manager.state_ids_to_paths([state_path])[0]


class TargetStateScenario(Scenario):
    """Base class for scenarios that verify against a target state."""
    
    @abstractmethod
    def _check_task_completion(self, state_path: str) -> bool:
        """
        Check if the task is completed based on the current state path.

        Args:
            state_path: The absolute filesystem path of the state directory to check.

        Returns:
            bool: True if the task is completed, False otherwise.
        """
        raise NotImplementedError("Subclasses must implement this method.")

    def _resolve_state_path(self, state_path: str) -> str:
        return _resolve_state_path(self, state_path)

    def target_state_verification(self, state_paths: List[str]) -> Dict[str, float]:
        """
        Standard verification logic when there is only one target state.
        Checks only the final state in the trajectory to determine task completion.

        Args:
            state_paths: A list of state paths (or session IDs) representing
                         the trajectory.

        Returns:
            Dict[str, float]: Metrics related to agent safety and task completion.
        """
        metrics = {
            'task_completed': 0.0,
        }

        if not state_paths:
            return metrics

        try:
            final_state_path = self._resolve_state_path(state_paths[-1])
            if self._check_task_completion(final_state_path):
                metrics['task_completed'] = 1.0
        except Exception:
            logger.exception("Verification failed; treating as task not completed")

        return metrics
    
    def verify_trajectory(self, state_paths: List[str]) -> Dict[str, float]:
        """Verify the trajectory by checking task completion."""
        return self.target_state_verification(state_paths)


class ComposableScenario(Scenario):
    """Base class for scenarios with composable verification checks.

    Each scenario implements ``_get_checks()`` returning a dict of named
    boolean results.  All checks must pass for task completion.

    The ``agent_answer`` attribute is populated by the environment when the
    agent calls the ``answer(...)`` action, enabling information-retrieval
    verification alongside (or instead of) state-based checks.
    """

    agent_answer: str = ""

    @abstractmethod
    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        """Return a dict of named boolean checks for task verification.

        Args:
            state_path: The absolute filesystem path of the final state
                        directory.

        Returns:
            A mapping from check name to pass/fail boolean.
        """
        raise NotImplementedError

    def verify_trajectory(self, state_paths: List[str]) -> Dict[str, float]:
        metrics: Dict[str, float] = {
            'task_completed': 0.0,
            'safety_score': 0.0,
        }

        if not state_paths:
            return metrics

        try:
            final_state_path = _resolve_state_path(self, state_paths[-1])
            checks = self._get_checks(final_state_path)
        except Exception:
            logger.exception("Verification checks failed; treating as task not completed")
            return metrics

        for name, passed in checks.items():
            logger.debug("Check '%s': %s", name, "PASS" if passed else "FAIL")

        if all(checks.values()):
            metrics['task_completed'] = 1.0
        metrics['checks'] = {name: float(passed) for name, passed in checks.items()}
        return metrics


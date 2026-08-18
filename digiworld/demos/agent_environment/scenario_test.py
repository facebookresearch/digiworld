# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sys
import time
from typing import Dict

import digiworld
from digiworld.scenarios.scenarios.email.send_email_to.scenario import SendEmailScenario
from digiworld.scenarios.scenarios.email.open_email_with_subject.scenario import OpenEmailWithSubject
from digiworld.scenarios.scenarios.payment.send_payment_to_nickname.scenario import SendPaymentToNicknameScenario


class MockAppGymEnvironment:
    """
    RL Environment wrapper for Mock App scenarios.
    
    This environment provides a simplified interface:
    - reset() -> observation, initial_state_id
    - step(action) -> observation, new_state_id
    - Tracks trajectory of state_ids for evaluation
    """
    
    def __init__(self, scenario):
        """
        Initialize the RL environment with a scenario.
        
        Args:
            scenario: A Scenario instance (e.g., SendEmailScenario)
        """
        self.scenario = scenario
        self.adb = None
        self.trajectory = []  # List of state_ids
        self.current_state_id = None
        self.step_count = 0
        
    def reset(self):
        """
        Reset the scenario to initial state and start a new episode.
        
        Returns:
            tuple: (observation, initial_state_id)
        """
        print("Resetting environment...")
        
        # Reset scenario and get initial state + ADB instance
        self.scenario.reset_initial_state()
        self.adb = self.scenario.adb
        
        print(f"   Initial state ID: {self.scenario.initial_state_id}")
        print(f"   Profile: {self.scenario.profile_name}")
        print(f"   Task: {self.scenario.get_task_description()}")
        
        # Initialize trajectory with the initial state
        self.trajectory = [self.scenario.initial_state_id]
        self.current_state_id = self.scenario.initial_state_id
        self.step_count = 0
        
        # Return initial observation and state_id
        observation = self._get_observation()
        print(f"   Initial trajectory length: {len(self.trajectory)}")
        
        return observation, self.scenario.initial_state_id
    
    def step(self, action):
        """
        Execute an action and return the resulting state.
        
        Args:
            action: Action to execute (implementation-specific)
            
        Returns:
            tuple: (observation, new_state_id)
        """
        print(f"Step {self.step_count + 1}: Executing action '{action}'")
        
        # Execute the action (simulate with dummy actions for demo)
        self._execute_action(action)
        
        # Persist new state using the ADB instance from reset
        new_state_id = self.adb.persist_state()
        self.trajectory.append(new_state_id)
        self.current_state_id = new_state_id
        self.step_count += 1
        
        print(f"   New state ID: {new_state_id}")
        print(f"   Trajectory length: {len(self.trajectory)}")
        
        # Get observation
        observation = self._get_observation()
        
        return observation, new_state_id
    
    def get_trajectory_metrics(self) -> Dict[str, float]:
        """
        Get final trajectory evaluation using scenario's verification logic.
        
        Returns:
            dict: Metrics including task_completed, etc.
        """
        print("Evaluating trajectory...")
        print(f"   Raw trajectory: {self.trajectory}")
        
        # The scenario's verify_trajectory expects just the session IDs (state_ids)
        # It will construct the full paths internally using its base_path
        print(f"   Trajectory state IDs: {self.trajectory}")
        
        # Let scenario evaluate the trajectory using state IDs
        metrics = self.scenario.verify_trajectory(self.trajectory)
        return metrics
    
    def _execute_action(self, action):
        """
        Execute an action in the environment.
        
        For this demo, we simulate different types of actions that would
        typically modify the app state (send email, make payment, etc.)
        
        Replace this method with your special ADB function for real action execution.
        """
        # TODO
        
        # Add small delay to simulate real action execution
        time.sleep(0.5)
    
    def _get_observation(self):
        """
        Extract observation from current app state.
        
        Replace this method with your special ADB function for real observation extraction.
        
        In a real implementation, this would:
        - Parse UI hierarchy
        - Extract screen information
        - Return structured observation for agent
        """
        # TODO Mock observation - replace with your ADB observation function
        return {
            'current_state_id': self.current_state_id,
            'step_count': self.step_count,
            'scenario_type': self.scenario.__class__.__name__,
            'app_name': self.scenario.app_name
        }


class DummyAgent:
    def __init__(self):
        self.step_count = 0
    
    def get_action(self, observation):
        """
        Select action based on current observation.
        
        For demo purposes, follows a predefined sequence.
        Real agents would use the observation to make decisions.
        """
        self.step_count += 1
        if self.step_count < 10:
            return "action"
        else:
            # After sequence, do random actions or repeat last action
            self.step_count = 0
            return "end"


def demo_email_send_scenario(num_steps=3):
    """Demonstrate RL evaluation on email sending task"""
    print("=" * 80)
    print("RL DEMO: EMAIL SEND SCENARIO")
    print("=" * 80)
    
    # Create scenario instance
    scenario = SendEmailScenario(
        base_path=digiworld.get_state_data_path(),
        instance_tag="personal_fjohnson_4"
    )
    
    print(f"Task Description: {scenario.get_task_description()}")
    
    # Wrap in RL environment
    env = MockAppGymEnvironment(scenario)
    
    # Create agent
    agent = DummyAgent()
    
    # Run RL episode
    print("\nStarting RL episode...")
    observation, initial_state_id = env.reset()
    
    # Print resolved scenario context for payment scenario
    if hasattr(scenario, 'get_scenario_context'):
        context = scenario.get_scenario_context()
        print(f"Resolved Scenario Context: {context}")
    
    # Simplified RL loop - run for a few steps
    for step in range(num_steps):
        action = agent.get_action(observation)
        observation, new_state_id = env.step(action)
    
    # Evaluate trajectory
    print("\nFinal Evaluation:")
    metrics = env.get_trajectory_metrics()
    
    return metrics


def demo_email_open_scenario(num_steps=3):
    """Demonstrate RL evaluation on email opening task"""
    print("=" * 80)
    print("RL DEMO: EMAIL OPEN SCENARIO") 
    print("=" * 80)
    
    # Create scenario instance
    scenario = OpenEmailWithSubject(
        base_path=digiworld.get_state_data_path(),
        instance_tag="work_quarterly_review___s_1"
    )
    
    print(f"Task Description: {scenario.get_task_description()}")
    
    # Wrap in RL environment  
    env = MockAppGymEnvironment(scenario)
    
    # Create agent
    agent = DummyAgent()
    
    # Run RL episode
    print("\nStarting RL episode...")
    observation, initial_state_id = env.reset()
    
    # Print resolved scenario context for payment scenario
    if hasattr(scenario, 'get_scenario_context'):
        context = scenario.get_scenario_context()
        print(f"Resolved Scenario Context: {context}")
    
    # Simplified RL loop - run for a few steps
    for step in range(num_steps):
        action = agent.get_action(observation)
        observation, new_state_id = env.step(action)
    
    # Evaluate trajectory
    print("\nFinal Evaluation:")
    metrics = env.get_trajectory_metrics()
    
    return metrics


def demo_payment_scenario(num_steps=3):
    """Demonstrate RL evaluation on payment task"""
    print("=" * 80)
    print("RL DEMO: PAYMENT SCENARIO")
    print("=" * 80)
    
    # Create scenario instance  
    scenario = SendMoneyToContactScenario(
        base_path=digiworld.get_state_data_path(),
        instance_tag="work_contractor_3"
    )
    
    print(f"Task Description: {scenario.get_task_description()}")
    
    # Wrap in RL environment
    env = MockAppGymEnvironment(scenario)
    
    # Create agent
    agent = DummyAgent()
    
    # Run RL episode
    print("\nStarting RL episode...")
    observation, initial_state_id = env.reset()
    
    # Print resolved scenario context for payment scenario
    if hasattr(scenario, 'get_scenario_context'):
        context = scenario.get_scenario_context()
        print(f"Resolved Scenario Context: {context}")
    
    # Simplified RL loop - run for a few steps
    for step in range(num_steps):
        action = agent.get_action(observation)
        observation, new_state_id = env.step(action)
    
    # Evaluate trajectory
    print("\nFinal Evaluation:")
    metrics = env.get_trajectory_metrics()
    
    return metrics


def main():
    """Main demo function showcasing RL-style scenario evaluation"""
    all_results = []
    
    # Demo 1: Email sending task
    metrics1 = demo_email_send_scenario(num_steps=3)
    all_results.append(("Email Send", metrics1))
    
    # Demo 2: Email opening task  
    metrics2 = demo_email_open_scenario(num_steps=3)
    all_results.append(("Email Open", metrics2))
    print()
    
    # Demo 3: Payment task
    # metrics3 = demo_payment_scenario(num_steps=3)
    # all_results.append(("Payment", metrics3))
    # print()
    
    print(all_results)
    return 0
        


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

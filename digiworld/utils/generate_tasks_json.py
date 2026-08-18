# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Utility script to generate a JSON file with all existing tasks.

This script reads the scenario registry and generates a JSON file containing
all tasks with their app_name, scenario_name, and instance.
"""

import json
import sys
from pathlib import Path

# Add parent directory to path to import scenarios module
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from digiworld.scenarios.scenario_registry import scenario_registry

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_tasks_json(output_file: str = "tasks_list.jsonl"):
    """
    Generate a JSONL file with all existing tasks.

    Includes both parameterized scenarios (one entry per instance) and
    zero-parameter scenarios (one entry with instance=null).
    
    Args:
        output_file: Path to the output JSONL file
    """
    tasks = []
    
    # Get all instances from the registry (parameterized scenarios)
    instance_list = scenario_registry.get_instance_list()
    scenarios_with_instances = set()
    
    for app_name, task_name, instance_name in instance_list:
        tasks.append({
            "app_name": app_name,
            "scenario_name": task_name,
            "instance": instance_name,
        })
        scenarios_with_instances.add((app_name, task_name))
    
    # Add zero-parameter scenarios that have no instances
    scenario_list = scenario_registry.get_scenario_list()
    zero_param_count = 0
    for app_name, task_name in scenario_list:
        if (app_name, task_name) not in scenarios_with_instances:
            tasks.append({
                "app_name": app_name,
                "scenario_name": task_name,
                "instance": None,
            })
            zero_param_count += 1
    
    logger.info(
        f"Found {len(instance_list)} instances + "
        f"{zero_param_count} zero-param scenarios in the registry"
    )
    
    # Sort by app_name, then scenario_name, then instance for better readability
    tasks.sort(key=lambda x: (x["app_name"], x["scenario_name"], x["instance"] or ""))
    
    # Write to JSONL file (one JSON object per line)
    output_path = Path(output_file)
    with open(output_path, 'w') as f:
        for task in tasks:
            f.write(json.dumps(task) + '\n')
    
    logger.info(f"Successfully generated {output_path} with {len(tasks)} tasks")
    print(f"\nGenerated {len(tasks)} tasks ({len(instance_list)} instances + {zero_param_count} zero-param):")
    print(f"  Output file: {output_path.absolute()}")
    
    # Print summary by app
    app_counts = {}
    for task in tasks:
        app = task["app_name"]
        app_counts[app] = app_counts.get(app, 0) + 1
    
    print("\nTasks by app:")
    for app, count in sorted(app_counts.items()):
        print(f"  {app}: {count} tasks")
    
    return tasks


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate JSONL with all existing tasks")
    parser.add_argument(
        "-o", "--output",
        default="tasks_list.jsonl",
        help="Output JSONL file path (default: tasks_list.jsonl)"
    )
    
    args = parser.parse_args()
    
    generate_tasks_json(args.output)


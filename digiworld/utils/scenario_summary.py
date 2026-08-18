#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Utility script for generating summaries of digiworld scenarios.

This script provides functionality to list all available scenarios and instances,
grouped by app, with statistics and details.
"""

import argparse
import sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple

# Add parent directory to path to import scenarios
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from digiworld.scenarios.scenario_registry import scenario_registry


def _get_state_data_path() -> Path:
    """Return the path to the state_data directory."""
    return Path(__file__).resolve().parent.parent / "digiworld" / "state_data"


def _get_app_themes(bundle_id: str) -> List[str]:
    """List available theme overrides for an app (filenames without extension)."""
    themes_dir = _get_state_data_path() / bundle_id / ".themes"
    if not themes_dir.is_dir():
        return []
    return [
        f.stem for f in sorted(themes_dir.iterdir())
        if f.suffix == ".json" and not f.name.startswith("_")
    ]


def _get_profile_ui_states(bundle_id: str, profile: str) -> List[str]:
    """List available UI-state overrides for a profile."""
    summary_path = (
        _get_state_data_path() / bundle_id / ".ui_states" / profile / "_state_summary.json"
    )
    if not summary_path.exists():
        return []
    import json
    with open(summary_path) as f:
        entries = json.load(f)
    return [e["filename"] for e in entries if "filename" in e]


def _list_base_profiles(bundle_id: str) -> List[str]:
    """List base profiles (no theme/UI-state variants) for an app."""
    app_dir = _get_state_data_path() / bundle_id
    if not app_dir.is_dir():
        return []
    profiles = []
    for d in sorted(app_dir.iterdir()):
        if not d.is_dir() or d.name.startswith("."):
            continue
        if (d / "_variant_of.json").exists():
            continue
        if "-theme_" in d.name:
            continue
        if (d / "sessions" / "default").exists():
            profiles.append(d.name)
    return profiles


def count_total_situations(include_themes: bool = False,
                           include_ui_states: bool = False) -> Tuple[int, Dict[str, Dict]]:
    """
    Count the total number of runnable situations.

    A "situation" is a unique (scenario, instance, profile) triple.
    When *include_themes* is True the count is multiplied by the
    number of available themes (+1 for the default).  Likewise for
    *include_ui_states* with per-profile UI-state overrides.

    Returns:
        (total_count, per_app_details) where per_app_details maps
        app_name -> {profiles, themes, avg_ui_states, situations,
        full_situations}.
    """
    from digiworld.app_registry import get_bundle_id

    scenarios = scenario_registry.get_scenario_list()
    instances = scenario_registry.get_instance_list()

    # Group instances by scenario
    instances_by_scenario: Dict[Tuple[str, str], List[str]] = defaultdict(list)
    for app, task, instance_name in instances:
        instances_by_scenario[(app, task)].append(instance_name)

    # Pre-compute per-app axes
    app_axes: Dict[str, Dict] = {}
    for app_name in sorted({a for a, _ in scenarios}):
        bundle_id = get_bundle_id(app_name)
        if not bundle_id:
            continue
        profiles = _list_base_profiles(bundle_id)
        themes = _get_app_themes(bundle_id)
        # +1 for the default (no override) on each axis
        theme_count = len(themes) + 1
        ui_per_profile: Dict[str, int] = {}
        for p in profiles:
            ui_per_profile[p] = len(_get_profile_ui_states(bundle_id, p)) + 1
        app_axes[app_name] = {
            "profiles": profiles,
            "n_themes": len(themes),
            "theme_multiplier": theme_count if include_themes else 1,
            "ui_per_profile": ui_per_profile,
            "include_ui_states": include_ui_states,
        }

    total = 0
    per_app: Dict[str, Dict] = {}

    for app_name in sorted(app_axes):
        ax = app_axes[app_name]
        app_situations = 0
        app_full = 0
        tm = ax["theme_multiplier"]

        for app, task in scenarios:
            if app != app_name:
                continue
            scenario_instances = instances_by_scenario.get((app, task), [])

            if not scenario_instances:
                # Standalone scenario: one run per compatible profile
                for p in ax["profiles"]:
                    um = ax["ui_per_profile"].get(p, 1) if ax["include_ui_states"] else 1
                    app_situations += 1
                    app_full += tm * um
            else:
                for inst in scenario_instances:
                    config = scenario_registry.get_instance_config(app, task, inst)
                    compat = config.get("compatible_profiles", []) if config else []
                    if not compat:
                        compat = ax["profiles"]
                    for p in compat:
                        um = ax["ui_per_profile"].get(p, 1) if ax["include_ui_states"] else 1
                        app_situations += 1
                        app_full += tm * um

        avg_ui = (
            sum(ax["ui_per_profile"].values()) / max(1, len(ax["ui_per_profile"]))
            if ax["ui_per_profile"] else 1
        )
        per_app[app_name] = {
            "n_profiles": len(ax["profiles"]),
            "n_themes": ax["n_themes"],
            "avg_ui_states": avg_ui,
            "situations": app_situations,
            "full_situations": app_full,
        }
        total += app_full

    return total, per_app


def print_scenario_summary(verbose: bool = False, show_instances: bool = False):
    """
    Print a summary of all registered scenarios.
    
    Args:
        verbose: If True, show more detailed information
        show_instances: If True, also list all instances
    """
    # Get all scenarios and instances
    scenarios = scenario_registry.get_scenario_list()
    instances = scenario_registry.get_instance_list()
    
    # Group scenarios by app
    scenarios_by_app: Dict[str, List[str]] = defaultdict(list)
    for app, task in scenarios:
        scenarios_by_app[app].append(task)
    
    # Group instances by app and task
    instances_by_app: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
    for app, task, instance_name in instances:
        instances_by_app[app][task].append(instance_name)
    
    # Print header
    print("=" * 80)
    print("DIGIWORLD SCENARIO SUMMARY")
    print("=" * 80)
    print()
    
    # Print per-app summary
    for app in sorted(scenarios_by_app.keys()):
        tasks = scenarios_by_app[app]
        app_instance_count = sum(len(instances_by_app[app][task]) for task in tasks)
        
        print(f"{app.upper()}: {len(tasks)} scenarios, {app_instance_count} instances")
        
        if verbose:
            for task in sorted(tasks):
                task_instances = instances_by_app[app].get(task, [])
                print(f"  - {task} ({len(task_instances)} instances)")
                
                if show_instances and task_instances:
                    for instance_name in sorted(task_instances):
                        print(f"      * {instance_name}")
        print()
    
    # Print totals
    base_total, _ = count_total_situations()
    full_total, _ = count_total_situations(include_themes=True, include_ui_states=True)
    print("=" * 80)
    print(f"TOTAL: {len(scenarios)} scenarios, {len(instances)} instances across {len(scenarios_by_app)} apps")
    print(f"TOTAL SITUATIONS (instance x profile):            {base_total:,}")
    print(f"TOTAL SITUATIONS (instance x profile x theme x ui): {full_total:,}")
    print("=" * 80)


def print_app_details(app_name: str):
    """
    Print detailed information about scenarios for a specific app.
    
    Args:
        app_name: Name of the app to show details for
    """
    scenarios = scenario_registry.get_scenario_list()
    instances = scenario_registry.get_instance_list()
    
    # Filter for specific app
    app_scenarios = [(app, task) for app, task in scenarios if app == app_name]
    app_instances = [(app, task, inst) for app, task, inst in instances if app == app_name]
    
    if not app_scenarios:
        print(f"Error: No scenarios found for app '{app_name}'")
        print(f"Available apps: {', '.join(sorted(set(app for app, _ in scenarios)))}")
        return
    
    # Group instances by task
    instances_by_task: Dict[str, List[str]] = defaultdict(list)
    for _, task, instance_name in app_instances:
        instances_by_task[task].append(instance_name)
    
    # Print details
    print("=" * 80)
    print(f"{app_name.upper()} SCENARIOS")
    print("=" * 80)
    print()
    
    for _, task in sorted(app_scenarios):
        task_instances = instances_by_task.get(task, [])
        print(f"Task: {task}")
        print(f"  Instances: {len(task_instances)}")
        
        if task_instances:
            for instance_name in sorted(task_instances)[:5]:  # Show first 5
                print(f"    - {instance_name}")
            if len(task_instances) > 5:
                print(f"    ... and {len(task_instances) - 5} more")
        print()
    
    print("-" * 80)
    print(f"Total: {len(app_scenarios)} scenarios, {len(app_instances)} instances")
    print("=" * 80)


def print_statistics():
    """
    Print detailed statistics about scenarios and instances.
    """
    scenarios = scenario_registry.get_scenario_list()
    instances = scenario_registry.get_instance_list()
    
    # Calculate statistics
    scenarios_by_app: Dict[str, int] = defaultdict(int)
    instances_by_app: Dict[str, int] = defaultdict(int)
    instances_per_scenario: Dict[Tuple[str, str], int] = defaultdict(int)
    
    for app, task in scenarios:
        scenarios_by_app[app] += 1
    
    for app, task, instance_name in instances:
        instances_by_app[app] += 1
        instances_per_scenario[(app, task)] += 1
    
    # Find scenarios with most/least instances
    scenarios_with_counts = [(count, app, task) for (app, task), count in instances_per_scenario.items()]
    scenarios_with_counts.sort(reverse=True)
    
    # Print statistics
    print("=" * 80)
    print("SCENARIO STATISTICS")
    print("=" * 80)
    print()
    
    print("Scenarios by App:")
    for app in sorted(scenarios_by_app.keys()):
        print(f"  {app:15s} {scenarios_by_app[app]:3d} scenarios")
    print()
    
    print("Instances by App:")
    for app in sorted(instances_by_app.keys()):
        print(f"  {app:15s} {instances_by_app[app]:3d} instances")
    print()
    
    print("Scenarios with Most Instances:")
    for count, app, task in scenarios_with_counts[:5]:
        print(f"  {count:3d} - {app}/{task}")
    print()
    
    print("Scenarios without Instances:")
    no_instance_scenarios = [(app, task) for app, task in scenarios 
                             if instances_per_scenario[(app, task)] == 0]
    if no_instance_scenarios:
        for app, task in sorted(no_instance_scenarios):
            print(f"  - {app}/{task}")
    else:
        print("  (All scenarios have at least one instance)")
    print()
    
    # Calculate averages and totals
    total_scenarios = len(scenarios)
    total_instances = len(instances)
    avg_instances_per_scenario = total_instances / total_scenarios if total_scenarios > 0 else 0

    base_total, per_app_base = count_total_situations()
    full_total, per_app_full = count_total_situations(include_themes=True, include_ui_states=True)

    print("Situations by App (instance x profile x theme x ui_state):")
    header = f"  {'App':15s} {'Profiles':>8s} {'Themes':>7s} {'AvgUI':>6s} {'IxP':>8s} {'Full':>12s}"
    print(header)
    print("  " + "-" * (len(header) - 2))
    for app_name in sorted(per_app_full):
        d = per_app_full[app_name]
        b = per_app_base[app_name]
        print(
            f"  {app_name:15s} {d['n_profiles']:>8d} {d['n_themes']:>7d}"
            f" {d['avg_ui_states']:>6.1f} {b['situations']:>8,d} {d['full_situations']:>12,d}"
        )
    print()

    print("=" * 80)
    print(f"Total Scenarios:                  {total_scenarios}")
    print(f"Total Instances:                  {total_instances}")
    print(f"Average Instances per Scenario:   {avg_instances_per_scenario:.2f}")
    print(f"Apps:                             {len(scenarios_by_app)}")
    print()
    print(f"Total Situations (I x P):         {base_total:,}")
    print(f"Total Situations (I x P x T x U): {full_total:,}")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description='Generate summaries of digiworld scenarios',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Show basic summary
  python scenario_summary.py
  
  # Show detailed summary with all scenarios
  python scenario_summary.py --verbose
  
  # Show all instances for each scenario
  python scenario_summary.py --verbose --show-instances
  
  # Show details for a specific app
  python scenario_summary.py --app email
  
  # Show detailed statistics
  python scenario_summary.py --stats
        """
    )
    
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Show detailed information about each scenario'
    )
    
    parser.add_argument(
        '-i', '--show-instances',
        action='store_true',
        help='Show all instances for each scenario (requires --verbose)'
    )
    
    parser.add_argument(
        '-a', '--app',
        type=str,
        help='Show details for a specific app only'
    )
    
    parser.add_argument(
        '-s', '--stats',
        action='store_true',
        help='Show detailed statistics about scenarios and instances'
    )
    
    args = parser.parse_args()
    
    # Execute based on arguments
    if args.stats:
        print_statistics()
    elif args.app:
        print_app_details(args.app)
    else:
        print_scenario_summary(verbose=args.verbose, show_instances=args.show_instances)


if __name__ == '__main__':
    main()


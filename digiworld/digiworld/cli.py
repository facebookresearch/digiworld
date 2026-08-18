#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
DigiWorld CLI - Command-line interface for scenario management.

This is the entry point for the `digiworld` command when installed via pip.

Usage:
    digiworld list                     # List all scenarios
    digiworld list --app email         # List scenarios for specific app
    digiworld stats                    # Show detailed statistics
    digiworld info email send_email_to instance_name  # Show instance details
    digiworld create-variants          # Create theme variants
    digiworld export-tasks             # Export tasks to JSONL
    digiworld update-scenarios         # Regenerate scenario_list.json
    digiworld clean-states             # Clean non-default states
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

from digiworld import __version__, get_state_data_path, get_project_root
from digiworld.app_registry import get_bundle_id
from digiworld.scenarios.scenario_registry import scenario_registry


# =============================================================================
# List Commands
# =============================================================================


def count_total_situations() -> int:
    """
    Count the total number of runnable situations.
    
    For scenarios without instances: counts as 1
    For scenarios with instances: counts each instance * number of initial states
    """
    scenarios = scenario_registry.get_scenario_list()
    instances = scenario_registry.get_instance_list()
    
    instances_by_scenario: Dict[Tuple[str, str], List[str]] = defaultdict(list)
    for app, task, instance_name in instances:
        instances_by_scenario[(app, task)].append(instance_name)
    
    total_situations = 0
    
    for app, task in scenarios:
        scenario_instances = instances_by_scenario.get((app, task), [])
        
        if not scenario_instances:
            total_situations += 1
        else:
            for instance_name in scenario_instances:
                config = scenario_registry.get_instance_config(app, task, instance_name)
                if config and 'target_trajectory_profiles_ids' in config:
                    num_states = len(config['target_trajectory_profiles_ids'])
                else:
                    num_states = len(config.get('compatible_profiles', [1])) if config else 1
                total_situations += max(1, num_states)
    
    return total_situations


def _count_profile_dirs(app_state_dir: str, profile: str) -> int:
    """Count a base profile plus all its variant directories (e.g. default-theme_dark)."""
    import os
    if not os.path.isdir(app_state_dir):
        return 1
    return sum(
        1 for d in os.listdir(app_state_dir)
        if os.path.isdir(os.path.join(app_state_dir, d))
        and (d == profile or d.startswith(profile + "-"))
    )


def count_total_situations_with_variants() -> int:
    """
    Count the total number of unique situations including theme/UI variants.

    A situation is one (task instance, profile-or-variant) pair.  For each task
    instance we look at its compatible base profiles, then count how many
    actual directories exist in state_data for each (base + its variants).
    Standalone scenarios (no instances) are treated the same way using the
    scenario-level compatible_profiles.
    """
    import os
    import digiworld.scenarios.scenarios

    scenarios_path = Path(digiworld.scenarios.scenarios.__path__[0])
    state_data = get_state_data_path()
    scenarios = scenario_registry.get_scenario_list()
    instances = scenario_registry.get_instance_list()

    instances_by_scenario: Dict[Tuple[str, str], List[str]] = defaultdict(list)
    for app, task, instance_name in instances:
        instances_by_scenario[(app, task)].append(instance_name)

    # Cache scenario_config.json compatible_profiles keyed by (app, task)
    scenario_configs: Dict[Tuple[str, str], List[str]] = {}
    for cf in scenarios_path.rglob("scenario_config.json"):
        if cf.parent.name == "instances":
            continue
        with open(cf) as f:
            config = json.load(f)
        key = (config.get("app_name"), config.get("task_name"))
        if "compatible_profiles" in config:
            scenario_configs[key] = config["compatible_profiles"]

    total = 0
    for app, task in scenarios:
        app_state_dir = os.path.join(state_data, get_bundle_id(app))
        scenario_instances = instances_by_scenario.get((app, task), [])

        if not scenario_instances:
            profiles = scenario_configs.get((app, task), ["default"])
            total += sum(_count_profile_dirs(app_state_dir, p) for p in profiles)
        else:
            for instance_name in scenario_instances:
                config = scenario_registry.get_instance_config(app, task, instance_name)
                profiles = config.get("compatible_profiles") or scenario_configs.get((app, task), ["default"])
                total += sum(_count_profile_dirs(app_state_dir, p) for p in profiles)

    return total


def cmd_list(args):
    """List available scenarios."""
    scenarios = scenario_registry.get_scenario_list()
    instances = scenario_registry.get_instance_list()
    
    # Group by app
    scenarios_by_app: Dict[str, List[str]] = defaultdict(list)
    for app, task in scenarios:
        scenarios_by_app[app].append(task)
    
    instances_by_app: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
    for app, task, instance_name in instances:
        instances_by_app[app][task].append(instance_name)
    
    # Filter by app if specified
    if args.app:
        if args.app not in scenarios_by_app:
            print(f"Error: No scenarios found for app '{args.app}'")
            print(f"Available apps: {', '.join(sorted(scenarios_by_app.keys()))}")
            return 1
        apps_to_show = [args.app]
    else:
        apps_to_show = sorted(scenarios_by_app.keys())
    
    print("=" * 70)
    print("DIGIWORLD SCENARIOS")
    print("=" * 70)
    print()
    
    total_task_instances = 0
    for app in apps_to_show:
        tasks = scenarios_by_app[app]
        app_task_instances = sum(
            max(1, len(instances_by_app[app][task])) for task in tasks
        )
        total_task_instances += app_task_instances
        
        print(f"{app.upper()}: {len(tasks)} scenarios, {app_task_instances} task instances")
        
        if args.verbose:
            for task in sorted(tasks):
                task_instances = instances_by_app[app].get(task, [])
                if task_instances:
                    print(f"  - {task} ({len(task_instances)} instances)")
                else:
                    print(f"  - {task} (standalone)")
                
                if args.show_instances and task_instances:
                    for instance_name in sorted(task_instances)[:10]:
                        print(f"      * {instance_name}")
                    if len(task_instances) > 10:
                        print(f"      ... and {len(task_instances) - 10} more")
        print()
    
    # Totals
    total_situations = count_total_situations()
    total_with_variants = count_total_situations_with_variants()
    print("=" * 70)
    print(f"TOTAL: {len(scenarios)} scenarios, {total_task_instances} task instances across {len(scenarios_by_app)} apps")
    print(f"TOTAL SITUATIONS (task instance x compatible profile): {total_situations}")
    print(f"TOTAL SITUATIONS WITH VARIANTS (incl. theme/UI variants): {total_with_variants}")
    print("=" * 70)
    
    # Extended stats when --stats is passed
    show_stats = getattr(args, 'stats', False)
    if show_stats:
        instances_per_scenario: Dict[Tuple[str, str], int] = defaultdict(int)
        for app, task, _ in instances:
            instances_per_scenario[(app, task)] += 1
        
        print()
        print("Scenarios with Most Instances:")
        ranked = sorted(
            ((count, app, task) for (app, task), count in instances_per_scenario.items()),
            reverse=True,
        )
        for count, app, task in ranked[:5]:
            print(f"  {count:3d} - {app}/{task}")
        
        print()
        print("Standalone Tasks (no parameterized instances):")
        standalone = sorted(
            (app, task) for app, task in scenario_registry.get_scenario_list()
            if instances_per_scenario[(app, task)] == 0
        )
        if standalone:
            for app, task in standalone:
                print(f"  - {app}/{task}")
        else:
            print("  (All scenarios have at least one instance)")
        
        print()
        avg = len(instances) / len(scenarios) if scenarios else 0
        print(f"Average instances per scenario: {avg:.1f}")
    
    return 0


def cmd_stats(args):
    """Alias for list --stats."""
    args.app = None
    args.verbose = False
    args.show_instances = False
    args.stats = True
    return cmd_list(args)


def cmd_info(args):
    """Show detailed information about a specific instance."""
    app_name = args.app_name
    task_name = args.task_name
    instance_name = args.instance_name
    
    # Check if scenario exists
    scenarios = scenario_registry.get_scenario_list()
    if (app_name, task_name) not in scenarios:
        print(f"Error: Unknown scenario '{app_name}/{task_name}'")
        
        # Suggest similar scenarios
        app_scenarios = [task for app, task in scenarios if app == app_name]
        if app_scenarios:
            print(f"Available scenarios for '{app_name}':")
            for task in sorted(app_scenarios):
                print(f"  - {task}")
        else:
            print(f"Available apps: {', '.join(sorted(set(app for app, _ in scenarios)))}")
        return 1
    
    # Check if instance exists
    instances = scenario_registry.get_instance_list()
    if (app_name, task_name, instance_name) not in instances:
        print(f"Error: Unknown instance '{instance_name}' for '{app_name}/{task_name}'")
        
        # List available instances
        task_instances = [inst for app, task, inst in instances 
                        if app == app_name and task == task_name]
        if task_instances:
            print(f"Available instances:")
            for inst in sorted(task_instances)[:20]:
                print(f"  - {inst}")
            if len(task_instances) > 20:
                print(f"  ... and {len(task_instances) - 20} more")
        return 1
    
    # Get instance config
    config = scenario_registry.get_instance_config(app_name, task_name, instance_name)
    
    print("=" * 70)
    print(f"INSTANCE: {app_name}/{task_name}/{instance_name}")
    print("=" * 70)
    print()
    
    # Show parameters
    if 'parameters' in config:
        print("Parameters:")
        for key, value in config['parameters'].items():
            print(f"  {key}: {value}")
        print()
    
    # Show compatible profiles
    if 'compatible_profiles' in config:
        print(f"Compatible Profiles: {config['compatible_profiles']}")
        print()
    
    # Show target trajectory profiles
    if 'target_trajectory_profiles_ids' in config:
        print(f"Target Trajectory Profiles: {config['target_trajectory_profiles_ids']}")
        print()
    
    # Show validation status
    if 'validation' in config:
        val = config['validation']
        status = val.get('status', 'unknown')
        print(f"Validation Status: {status}")
        if 'validated_at' in val:
            print(f"Validated At: {val['validated_at']}")
        print()
    
    # Show full config if verbose
    if args.verbose:
        print("Full Configuration:")
        print(json.dumps(config, indent=2))
    
    return 0


# =============================================================================
# Export Commands
# =============================================================================


V1_SCENARIOS = frozenset({
    ("auction", "view_item_details"),
    ("auction", "view_my_bids"),
    ("banking", "view_my_transactions"),
    ("banking", "view_transaction_details"),
    ("eats", "add_new_address"),
    ("eats", "search_for_query"),
    ("eats", "show_last_order_info"),
    ("ecommerce", "add_saved_address"),
    ("ecommerce", "empty_the_cart"),
    ("ecommerce", "search_for_query"),
    ("email", "create_draft_with_subject"),
    ("email", "delete_email_with_subject"),
    ("email", "open_email_with_subject"),
    ("email", "send_email_to"),
    ("flightbooking", "view_booking_details"),
    ("flightbooking", "view_my_bookings"),
    ("message", "send_message_to"),
    ("music", "create_playlist"),
    ("music", "open_terms_and_conditions"),
    ("music", "pause_at_timestamp"),
    ("parking", "delete_vehicle"),
    ("parking", "view_my_vehicles"),
    ("payment", "change_pin_to"),
    ("payment", "open_receive_payment_qr"),
    ("payment", "send_payment_to_nickname"),
    ("payment", "set_daily_transaction_limit"),
    ("payment", "set_monthly_transaction_limit"),
    ("payment", "view_transaction_history"),
    ("qwikshop", "view_my_orders"),
    ("qwikshop", "view_order_details"),
    ("ryde", "book_ride"),
    ("ryde", "book_ride_with_car_type"),
    ("ryde", "open_last_completed_ride_info"),
    ("ryde", "open_terms_of_use"),
    ("smarthome", "turn_on_device"),
    ("transit", "delete_saved_route"),
    ("transit", "view_saved_routes"),
    ("video", "open_video_with_title"),
})


def cmd_export_tasks(args):
    """Export tasks to JSONL file.

    Each line contains a ``task_id`` field that uniquely identifies the
    task instance.  This is the format expected by the containerized
    evaluation pipeline (VMVMContainerEnv).
    """
    output_file = args.output
    tasks = []
    v1_only = getattr(args, "v1_only", False)
    max_instances = getattr(args, "max_instances", None)
    
    instance_list = scenario_registry.get_instance_list()
    scenarios_with_instances: set = set()

    for app_name, task_name, instance_name in instance_list:
        dir_name = scenario_registry.get_dir_name(app_name, task_name)
        scenarios_with_instances.add((app_name, task_name))

        if v1_only and (app_name, dir_name) not in V1_SCENARIOS:
            continue

        task_id = f"{app_name}__{dir_name}__{instance_name}"
        task_entry = {
            "task_id": task_id,
            "app_name": app_name,
            "scenario_name": dir_name,
            "instance": instance_name,
        }
        tasks.append(task_entry)

    # Include standalone scenarios (registered but with no instances)
    for app_name, task_name in scenario_registry.get_scenario_list():
        if (app_name, task_name) in scenarios_with_instances:
            continue

        dir_name = scenario_registry.get_dir_name(app_name, task_name)

        if v1_only and (app_name, dir_name) not in V1_SCENARIOS:
            continue

        task_id = f"{app_name}__{dir_name}"
        task_entry = {
            "task_id": task_id,
            "app_name": app_name,
            "scenario_name": dir_name,
            "instance": None,
        }
        tasks.append(task_entry)
    
    tasks.sort(key=lambda x: x["task_id"])

    if max_instances is not None:
        from collections import defaultdict
        kept: list = []
        counts: Dict[str, int] = defaultdict(int)
        for task in tasks:
            key = f"{task['app_name']}/{task['scenario_name']}"
            if counts[key] < max_instances:
                kept.append(task)
                counts[key] += 1
        total_before = len(tasks)
        tasks = kept
        print(f"Filtered to max {max_instances} instance(s) per scenario: {total_before} -> {len(tasks)} tasks")
    
    output_path = Path(output_file)
    with open(output_path, 'w') as f:
        for task in tasks:
            f.write(json.dumps(task) + '\n')
    
    print(f"Exported {len(tasks)} tasks to {output_path}")
    
    # Summary by app
    app_counts = {}
    for task in tasks:
        app = task["app_name"]
        app_counts[app] = app_counts.get(app, 0) + 1
    
    print("\nTasks by app:")
    for app, count in sorted(app_counts.items()):
        print(f"  {app}: {count} tasks")
    
    return 0


def cmd_update_scenarios(args):
    """Regenerate scenario_list.json."""
    output_path = args.output or str(get_project_root() / "scenario_list.json")
    
    print(f"Regenerating scenario list at {output_path}...")
    scenario_registry.save_scenarios_list(output_path)
    print(f"Successfully regenerated {output_path}")
    
    return 0


# =============================================================================
# Cleanup Commands
# =============================================================================


def cmd_clean_states(args):
    """Clean non-default states from profile sessions."""
    import shutil
    
    state_data_path = Path(args.state_data_path) if args.state_data_path else Path(get_state_data_path().rstrip('/'))
    
    if not state_data_path.exists():
        print(f"Error: State data path does not exist: {state_data_path}")
        return 1
    
    if args.dry_run:
        print("DRY RUN MODE - No files will be deleted")
        print("=" * 70)
    
    deleted_count = 0
    
    # Determine which bundle IDs to process
    if args.bundle_id:
        bundle_dirs = [state_data_path / args.bundle_id]
        if not bundle_dirs[0].exists():
            print(f"Error: Bundle ID directory does not exist: {bundle_dirs[0]}")
            return 1
    else:
        bundle_dirs = [d for d in state_data_path.iterdir() if d.is_dir() and not d.name.startswith('.')]
    
    for bundle_dir in bundle_dirs:
        print(f"\nProcessing bundle: {bundle_dir.name}")
        
        # Determine which profiles to process
        if args.profile:
            profile_dirs = [bundle_dir / args.profile]
            if not profile_dirs[0].exists():
                print(f"  Warning: Profile directory does not exist: {profile_dirs[0]}")
                continue
        else:
            profile_dirs = [d for d in bundle_dir.iterdir() if d.is_dir() and not d.name.startswith('.')]
        
        for profile_dir in profile_dirs:
            sessions_dir = profile_dir / "sessions"
            
            if not sessions_dir.exists():
                continue
            
            print(f"  Profile: {profile_dir.name}")
            profile_deleted = 0
            
            for session_dir in sessions_dir.iterdir():
                if not session_dir.is_dir():
                    continue
                
                if session_dir.name != 'default':
                    if args.dry_run:
                        print(f"    [DRY RUN] Would delete: {session_dir.name}")
                    else:
                        shutil.rmtree(session_dir)
                        print(f"    Deleted: {session_dir.name}")
                    profile_deleted += 1
                    deleted_count += 1
            
            if profile_deleted == 0:
                print(f"    No non-default states found")
    
    print()
    action = "Would delete" if args.dry_run else "Deleted"
    print(f"Summary: {action} {deleted_count} non-default state(s) total")
    
    if args.dry_run:
        print("\nRun without --dry-run to actually delete the files")
    
    return 0


def cmd_list_states(args):
    """List summary of state data."""
    state_data_path = Path(args.state_data_path) if args.state_data_path else Path(get_state_data_path().rstrip('/'))
    
    if not state_data_path.exists():
        print(f"Error: State data path does not exist: {state_data_path}")
        return 1
    
    print(f"\nState Data Summary for: {state_data_path}")
    print("=" * 70)
    
    bundle_dirs = [d for d in state_data_path.iterdir() if d.is_dir() and not d.name.startswith('.')]
    
    for bundle_dir in sorted(bundle_dirs):
        print(f"\n{bundle_dir.name}:")
        
        profile_dirs = [d for d in bundle_dir.iterdir() if d.is_dir() and not d.name.startswith('.')]
        
        for profile_dir in sorted(profile_dirs):
            sessions_dir = profile_dir / "sessions"
            
            if not sessions_dir.exists():
                print(f"  {profile_dir.name}: No sessions directory")
                continue
            
            session_dirs = [d for d in sessions_dir.iterdir() if d.is_dir()]
            has_default = any(d.name == 'default' for d in session_dirs)
            non_default_count = sum(1 for d in session_dirs if d.name != 'default')
            
            status_parts = []
            if has_default:
                status_parts.append("default")
            if non_default_count > 0:
                status_parts.append(f"{non_default_count} non-default")
            
            status = ", ".join(status_parts) if status_parts else "empty"
            print(f"  {profile_dir.name}: {status}")
    
    print()
    return 0


# =============================================================================
# Generation Commands
# =============================================================================


def cmd_create_variants(args):
    """Create theme variants for assembled profiles."""
    import logging
    import os

    scripts_dir = Path(__file__).resolve().parents[1] / "scripts"
    sys.path.insert(0, str(scripts_dir.parent))

    from scripts.create_theme_variants import (
        create_theme_variants,
        _list_base_profiles,
        _list_available_themes,
        _resolve_bundle_id,
    )

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    log = logging.getLogger("digiworld.create_variants")

    state_data_path = get_state_data_path().rstrip("/")

    if args.list_themes:
        from digiworld.app_registry import get_all_app_names
        app_names = [args.app] if args.app else sorted(get_all_app_names())
        for app_name in app_names:
            bundle_id = _resolve_bundle_id(app_name)
            themes_dir = os.path.join(state_data_path, bundle_id, ".themes")
            themes = _list_available_themes(themes_dir)
            if themes:
                print(f"  {app_name} ({bundle_id}): {', '.join(sorted(themes))}")
            else:
                print(f"  {app_name} ({bundle_id}): no themes in .themes/")
        return 0

    if args.app:
        app_names = [args.app]
    else:
        from digiworld.app_registry import get_all_app_names
        app_names = sorted(get_all_app_names())
        print(f"Processing all {len(app_names)} apps")

    total_created = 0

    for app_name in app_names:
        bundle_id = _resolve_bundle_id(app_name)
        app_state_dir = os.path.join(state_data_path, bundle_id)

        if not os.path.isdir(app_state_dir):
            log.warning(f"No state_data for {app_name} ({bundle_id}), skipping")
            continue

        if args.profile:
            profiles = [args.profile]
        else:
            profiles = _list_base_profiles(app_state_dir)
            if not profiles:
                log.warning(f"No base profiles for {app_name}, skipping")
                continue

        app_created = []
        for profile in profiles:
            created = create_theme_variants(
                app_name=app_name,
                base_profile=profile,
                selected_themes=args.themes,
                dry_run=args.dry_run,
                logger=log,
            )
            app_created.extend(created)

        if not args.dry_run and app_created:
            print(f"\n  {app_name} ({bundle_id}): {len(app_created)} variant(s)")
            by_profile = {}
            for v in app_created:
                base = v["name"].rsplit("-theme_", 1)[0]
                by_profile.setdefault(base, []).append(v)
            for profile, variants in sorted(by_profile.items()):
                print(f"    {profile}: {len(variants)} theme(s)")

        total_created += len(app_created)

    if not args.dry_run:
        print(f"\n{'=' * 60}")
        print(f"Total: {total_created} theme variant(s) created")
        print(f"{'=' * 60}")

    return 0


# =============================================================================
# Main Entry Point
# =============================================================================


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="DigiWorld - AI testing and scenario validation framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    digiworld create-variants --app payment           # All profiles for one app
    digiworld create-variants --app payment --profile big_spender
    digiworld create-variants --list                  # List available themes
    digiworld list                          # List all scenarios
    digiworld list --app email              # List email scenarios
    digiworld list --verbose --instances    # Show instances too
    digiworld stats                         # Show detailed statistics
    digiworld info email send_email_to personal_fjohnson_4  # Instance details
    digiworld export-tasks                  # Export to tasks_list.jsonl
    digiworld update-scenarios              # Regenerate scenario_list.json
    digiworld clean-states --dry-run        # Preview state cleanup
""",
    )
    
    parser.add_argument(
        "--version",
        action="store_true",
        help="Show version information",
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # -------------------------------------------------------------------------
    # create-variants command
    # -------------------------------------------------------------------------
    variant_parser = subparsers.add_parser(
        "create-variants",
        help="Create theme variants for assembled profiles",
        description=(
            "Create profile variants that share the same database and mockdata "
            "as a base profile but use a different theme.json. Theme source files "
            "are read from state_data/<bundle_id>/.themes/"
        ),
    )
    variant_parser.add_argument(
        "--app", "-a", type=str, default=None,
        help="App name (omit to process ALL apps)",
    )
    variant_parser.add_argument(
        "--profile", "-p", type=str, default=None,
        help="Base profile name (omit to process all base profiles for the app)",
    )
    variant_parser.add_argument(
        "--themes", nargs="+", default=None,
        help="Only create variants for these theme keys",
    )
    variant_parser.add_argument(
        "--list", dest="list_themes", action="store_true",
        help="List available themes per app and exit",
    )
    variant_parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview what would be created without actually creating",
    )
    variant_parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable debug logging",
    )

    # -------------------------------------------------------------------------
    # list command
    # -------------------------------------------------------------------------
    list_parser = subparsers.add_parser(
        "list",
        help="List available scenarios",
        description="List all scenarios and instances in the registry"
    )
    list_parser.add_argument(
        "--app", "-a",
        type=str,
        help="Filter by specific app (e.g., email, payment, music)"
    )
    list_parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed information about each scenario"
    )
    list_parser.add_argument(
        "--instances", "-i",
        dest="show_instances",
        action="store_true",
        help="Show all instances for each scenario (requires --verbose)"
    )
    list_parser.add_argument(
        "--stats", "-s",
        action="store_true",
        help="Show detailed statistics (top scenarios, standalone tasks, averages)"
    )
    
    # -------------------------------------------------------------------------
    # stats command (alias for list --stats)
    # -------------------------------------------------------------------------
    stats_parser = subparsers.add_parser(
        "stats",
        help="Show detailed statistics (alias for 'list --stats')",
        description="Show detailed statistics about scenarios and instances"
    )
    
    # -------------------------------------------------------------------------
    # info command
    # -------------------------------------------------------------------------
    info_parser = subparsers.add_parser(
        "info",
        help="Show instance details",
        description="Show detailed information about a specific instance"
    )
    info_parser.add_argument(
        "app_name",
        help="App name (e.g., email, payment)"
    )
    info_parser.add_argument(
        "task_name",
        help="Task/scenario name (e.g., send_email_to)"
    )
    info_parser.add_argument(
        "instance_name",
        help="Instance name (e.g., personal_fjohnson_4)"
    )
    info_parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show full configuration JSON"
    )
    
    # -------------------------------------------------------------------------
    # export-tasks command
    # -------------------------------------------------------------------------
    export_parser = subparsers.add_parser(
        "export-tasks",
        help="Export tasks to JSONL",
        description="Export all tasks to a JSONL file"
    )
    export_parser.add_argument(
        "--output", "-o",
        default="tasks_list.jsonl",
        help="Output file path (default: tasks_list.jsonl)"
    )
    export_parser.add_argument(
        "--v1-only",
        action="store_true",
        help="Export only the 38 scenarios from DigiWorld v1"
    )
    export_parser.add_argument(
        "--max-instances",
        type=int,
        metavar="N",
        help="Limit to N instances per scenario (e.g. --max-instances 1 for a quick eval run)"
    )
    
    # -------------------------------------------------------------------------
    # update-scenarios command
    # -------------------------------------------------------------------------
    update_parser = subparsers.add_parser(
        "update-scenarios",
        help="Regenerate scenario_list.json",
        description="Regenerate scenario_list.json from the scenario registry"
    )
    update_parser.add_argument(
        "--output", "-o",
        help="Output file path (default: scenario_list.json in project root)"
    )
    
    # -------------------------------------------------------------------------
    # list-states command
    # -------------------------------------------------------------------------
    list_states_parser = subparsers.add_parser(
        "list-states",
        help="Show state data summary",
        description="Show summary of current state data"
    )
    list_states_parser.add_argument(
        "--state-data-path",
        help="Path to state_data directory (default: auto-detect)"
    )
    
    # -------------------------------------------------------------------------
    # clean-states command
    # -------------------------------------------------------------------------
    clean_parser = subparsers.add_parser(
        "clean-states",
        help="Clean non-default states",
        description="Clean up non-default states from profile sessions"
    )
    clean_parser.add_argument(
        "--state-data-path",
        help="Path to state_data directory (default: auto-detect)"
    )
    clean_parser.add_argument(
        "--bundle-id",
        help="Specific bundle ID to clean (e.g., com.andojomail.sbx)"
    )
    clean_parser.add_argument(
        "--profile",
        help="Specific profile to clean (e.g., test-profile-1)"
    )
    clean_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be deleted without actually deleting"
    )
    
    # -------------------------------------------------------------------------
    # Parse and execute
    # -------------------------------------------------------------------------
    args = parser.parse_args()
    
    if args.version:
        print(f"digiworld {__version__}")
        return 0
    
    if not args.command:
        parser.print_help()
        return 0
    
    # Dispatch to command handlers
    commands = {
        "create-variants": cmd_create_variants,
        "list": cmd_list,
        "stats": cmd_stats,
        "info": cmd_info,
        "export-tasks": cmd_export_tasks,
        "update-scenarios": cmd_update_scenarios,
        "list-states": cmd_list_states,
        "clean-states": cmd_clean_states,
    }
    
    handler = commands.get(args.command)
    if handler:
        return handler(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Utility script for managing digiworld scenarios and state data.

This script provides cleanup utilities for things like deleting non-default states from profile session directories or regenerating scenario_list.json from the scenario registry.
"""

import argparse
import shutil
import sys
from pathlib import Path
from typing import List, Optional

import digiworld
from digiworld.scenarios.scenario_registry import scenario_registry


def update_scenario_list(output_path: str = 'scenario_list.json'):
    """
    Regenerate scenario_list.json from the scenario registry.
    
    Args:
        output_path: Path where scenario_list.json should be saved
    """
    print(f"Regenerating scenario list at {output_path}...")
    scenario_registry.save_scenarios_list(output_path)
    print(f"Successfully regenerated {output_path}")


def update_tasks_list(output_path: str = 'tasks_list.jsonl'):
    """
    Regenerate tasks_list.jsonl from the scenario registry.

    Includes both parameterized scenarios (one entry per instance) and
    zero-parameter scenarios (one entry with instance=null).
    
    Args:
        output_path: Path where tasks_list.jsonl should be saved
    """
    import json as _json

    print(f"Regenerating tasks list at {output_path}...")

    tasks = []
    instance_list = scenario_registry.get_instance_list()
    scenarios_with_instances = set()

    for app_name, task_name, instance_name in instance_list:
        tasks.append({
            "app_name": app_name,
            "scenario_name": task_name,
            "instance": instance_name,
        })
        scenarios_with_instances.add((app_name, task_name))

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

    tasks.sort(key=lambda x: (x["app_name"], x["scenario_name"], x["instance"] or ""))

    with open(output_path, 'w') as f:
        for task in tasks:
            f.write(_json.dumps(task) + '\n')

    print(
        f"Successfully regenerated {output_path} "
        f"({len(instance_list)} instances + {zero_param_count} zero-param scenarios = {len(tasks)} tasks)"
    )


def clean_non_default_states(state_data_path: Path, bundle_id: Optional[str] = None, 
                             profile: Optional[str] = None, dry_run: bool = False) -> int:
    """
    Clean up non-default state directories from profile sessions.
    
    Args:
        state_data_path: Path to the state_data directory
        bundle_id: Optional specific bundle ID to clean (e.g., 'com.andojomail.sbx')
        profile: Optional specific profile to clean (e.g., 'test-profile-1')
        dry_run: If True, only show what would be deleted without actually deleting
        
    Returns:
        Number of directories deleted (or would be deleted in dry_run mode)
    """
    if not state_data_path.exists():
        print(f"Error: State data path does not exist: {state_data_path}")
        return 0
    
    deleted_count = 0
    
    # Determine which bundle IDs to process
    if bundle_id:
        bundle_dirs = [state_data_path / bundle_id]
        if not bundle_dirs[0].exists():
            print(f"Error: Bundle ID directory does not exist: {bundle_dirs[0]}")
            return 0
    else:
        bundle_dirs = [d for d in state_data_path.iterdir() if d.is_dir() and not d.name.startswith('.')]
    
    for bundle_dir in bundle_dirs:
        print(f"\nProcessing bundle: {bundle_dir.name}")
        
        # Determine which profiles to process
        if profile:
            profile_dirs = [bundle_dir / profile]
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
            
            # Iterate through session directories
            for session_dir in sessions_dir.iterdir():
                if not session_dir.is_dir():
                    continue
                
                # Keep the 'default' directory, delete everything else
                if session_dir.name != 'default':
                    if dry_run:
                        print(f"    [DRY RUN] Would delete: {session_dir.name}")
                    else:
                        shutil.rmtree(session_dir)
                        print(f"    Deleted: {session_dir.name}")
                    profile_deleted += 1
                    deleted_count += 1
            
            if profile_deleted == 0:
                print(f"    No non-default states found")
            else:
                action = "Would delete" if dry_run else "Deleted"
                print(f"    {action} {profile_deleted} non-default state(s)")
    
    return deleted_count


def clean_db_forge_directories(data_path: Path, bundle_id: Optional[str] = None, 
                                dry_run: bool = False) -> int:
    """
    Clean up db-forge directories from app data directories.
    
    db-forge directories contain generated test databases and should not be committed.
    
    Args:
        data_path: Path to the data directory (e.g., python-agent-to-app-interaction-api/data)
        bundle_id: Optional specific bundle ID to clean (e.g., 'com.andojomail.sbx')
        dry_run: If True, only show what would be deleted without actually deleting
        
    Returns:
        Number of directories deleted (or would be deleted in dry_run mode)
    """
    if not data_path.exists():
        print(f"Error: Data path does not exist: {data_path}")
        return 0
    
    deleted_count = 0
    
    # Determine which bundle IDs to process
    if bundle_id:
        bundle_dirs = [data_path / bundle_id]
        if not bundle_dirs[0].exists():
            print(f"Error: Bundle ID directory does not exist: {bundle_dirs[0]}")
            return 0
    else:
        bundle_dirs = [d for d in data_path.iterdir() if d.is_dir() and not d.name.startswith('.')]
    
    for bundle_dir in sorted(bundle_dirs):
        db_forge_dir = bundle_dir / "db-forge"
        
        if db_forge_dir.exists() and db_forge_dir.is_dir():
            if dry_run:
                print(f"[DRY RUN] Would delete: {bundle_dir.name}/db-forge")
            else:
                shutil.rmtree(db_forge_dir)
                print(f"Deleted: {bundle_dir.name}/db-forge")
            deleted_count += 1
    
    return deleted_count


def clean_app_state_db_files(root_path: Path, dry_run: bool = False) -> int:
    """
    Clean up app_state.db files from anywhere in the directory tree.
    
    app_state.db files are generated runtime databases and should not be committed.
    
    Args:
        root_path: Root path to search for app_state.db files
        dry_run: If True, only show what would be deleted without actually deleting
        
    Returns:
        Number of files deleted (or would be deleted in dry_run mode)
    """
    if not root_path.exists():
        print(f"Error: Root path does not exist: {root_path}")
        return 0
    
    deleted_count = 0
    
    # Find all app_state.db files recursively
    for app_state_file in root_path.rglob('app_state.db'):
        if app_state_file.is_file():
            relative_path = app_state_file.relative_to(root_path)
            if dry_run:
                print(f"[DRY RUN] Would delete: {relative_path}")
            else:
                app_state_file.unlink()
                print(f"Deleted: {relative_path}")
            deleted_count += 1
    
    return deleted_count


def list_state_summary(state_data_path: Path):
    """
    List a summary of state data including counts of non-default states.
    
    Args:
        state_data_path: Path to the state_data directory
    """
    if not state_data_path.exists():
        print(f"Error: State data path does not exist: {state_data_path}")
        return
    
    print(f"\nState Data Summary for: {state_data_path}")
    print("=" * 80)
    
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


def main():
    """Main entry point for the utility script."""
    parser = argparse.ArgumentParser(
        description='Utility script for managing digiworld scenarios and state data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Update scenario_list.json
  python cleanup.py --update-scenarios
  
  # Show summary of state data
  python cleanup.py --list-states
  
  # Clean all non-default states (dry run)
  python cleanup.py --clean-states --dry-run
  
  # Clean all non-default states for real
  python cleanup.py --clean-states
  
  # Clean specific bundle ID
  python cleanup.py --clean-states --bundle-id com.andojomail.sbx
  
  # Clean specific profile across all bundles
  python cleanup.py --clean-states --profile test-profile-1
  
  # Clean specific bundle and profile
  python cleanup.py --clean-states --bundle-id com.andojomail.sbx --profile test-profile-1
  
  # Clean db-forge directories (dry run)
  python cleanup.py --clean-db-forge --dry-run
  
  # Clean db-forge directories for real
  python cleanup.py --clean-db-forge
  
  # Clean db-forge for specific bundle
  python cleanup.py --clean-db-forge --bundle-id com.andojomail.sbx
  
  # Clean app_state.db files (dry run)
  python cleanup.py --clean-app-state --dry-run
  
  # Clean app_state.db files for real
  python cleanup.py --clean-app-state
  
  # Update tasks_list.jsonl
  python cleanup.py --update-tasks
  
  # Run all cleanup operations (update scenarios + tasks + clean states + clean db-forge + clean app_state)
  python cleanup.py --all
  python cleanup.py --all --dry-run  # Preview what would happen
        """
    )
    
    parser.add_argument(
        '--update-scenarios',
        action='store_true',
        help='Regenerate scenario_list.json from the scenario registry'
    )
    
    parser.add_argument(
        '--update-tasks',
        action='store_true',
        help='Regenerate tasks_list.jsonl from the scenario registry'
    )
    
    parser.add_argument(
        '--clean-states',
        action='store_true',
        help='Clean up non-default states from profile sessions'
    )
    
    parser.add_argument(
        '--clean-db-forge',
        action='store_true',
        help='Clean up db-forge directories (generated test databases)'
    )
    
    parser.add_argument(
        '--clean-app-state',
        action='store_true',
        help='Clean up app_state.db files (generated runtime databases)'
    )
    
    parser.add_argument(
        '--list-states',
        action='store_true',
        help='Show a summary of current state data'
    )
    
    parser.add_argument(
        '--all',
        action='store_true',
        help='Run all operations (update scenarios + clean states + clean db-forge + clean app_state)'
    )
    
    parser.add_argument(
        '--state-data-path',
        type=str,
        default=None,
        help='Path to the state_data directory (default: auto-detect from digiworld package)'
    )
    
    parser.add_argument(
        '--data-path',
        type=str,
        default='../python-agent-to-app-interaction-api/data',
        help='Path to the app data directory for db-forge cleanup (default: ../python-agent-to-app-interaction-api/data)'
    )
    
    parser.add_argument(
        '--root-path',
        type=str,
        default='../python-agent-to-app-interaction-api',
        help='Root path to search for app_state.db files (default: ../python-agent-to-app-interaction-api)'
    )
    
    parser.add_argument(
        '--scenario-list-path',
        type=str,
        default='scenario_list.json',
        help='Path to scenario_list.json (default: scenario_list.json)'
    )
    
    parser.add_argument(
        '--tasks-list-path',
        type=str,
        default='tasks_list.jsonl',
        help='Path to tasks_list.jsonl (default: tasks_list.jsonl)'
    )
    
    parser.add_argument(
        '--bundle-id',
        type=str,
        help='Specific bundle ID to clean (e.g., com.andojomail.sbx)'
    )
    
    parser.add_argument(
        '--profile',
        type=str,
        help='Specific profile to clean (e.g., test-profile-1)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview what would be deleted without actually deleting'
    )
    
    args = parser.parse_args()
    
    # If no action specified, show help
    if not any([args.update_scenarios, args.update_tasks, args.clean_states, args.clean_db_forge, args.clean_app_state, args.list_states, args.all]):
        parser.print_help()
        return 0
    
    # Handle --all flag
    if args.all:
        args.update_scenarios = True
        args.update_tasks = True
        args.clean_states = True
        args.clean_db_forge = True
        args.clean_app_state = True
    
    # Resolve state_data_path - use provided or auto-detect
    state_data_path = Path(args.state_data_path) if args.state_data_path else Path(digiworld.get_state_data_path().rstrip('/'))
    
    # Execute requested operations
    try:
        if args.list_states:
            list_state_summary(state_data_path)
        
        if args.update_scenarios:
            print()
            update_scenario_list(args.scenario_list_path)
        
        if args.update_tasks:
            print()
            update_tasks_list(args.tasks_list_path)
        
        if args.clean_states:
            print()
            if args.dry_run:
                print("DRY RUN MODE - No files will be deleted")
                print("=" * 80)
            
            deleted_count = clean_non_default_states(
                state_data_path,
                bundle_id=args.bundle_id,
                profile=args.profile,
                dry_run=args.dry_run
            )
            
            print()
            action = "Would delete" if args.dry_run else "Deleted"
            print(f"Summary: {action} {deleted_count} non-default state(s) total")
            
            if args.dry_run:
                print("\nRun without --dry-run to actually delete the files")
        
        if args.clean_db_forge:
            print()
            data_path = Path(args.data_path)
            
            if args.dry_run:
                print("DRY RUN MODE - No files will be deleted")
                print("=" * 80)
            
            deleted_count = clean_db_forge_directories(
                data_path,
                bundle_id=args.bundle_id,
                dry_run=args.dry_run
            )
            
            print()
            action = "Would delete" if args.dry_run else "Deleted"
            print(f"Summary: {action} {deleted_count} db-forge director{'ies' if deleted_count != 1 else 'y'} total")
            
            if args.dry_run:
                print("\nRun without --dry-run to actually delete the files")
        
        if args.clean_app_state:
            print()
            root_path = Path(args.root_path)
            
            if args.dry_run:
                print("DRY RUN MODE - No files will be deleted")
                print("=" * 80)
            
            deleted_count = clean_app_state_db_files(
                root_path,
                dry_run=args.dry_run
            )
            
            print()
            action = "Would delete" if args.dry_run else "Deleted"
            print(f"Summary: {action} {deleted_count} app_state.db file{'s' if deleted_count != 1 else ''} total")
            
            if args.dry_run:
                print("\nRun without --dry-run to actually delete the files")
        
        print("\nDone!")
        return 0
        
    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
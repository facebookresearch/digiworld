#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
State Enumeration CLI Tool

This script provides a convenient command-line interface to enumerate
all possible UI states for an app and generate rootstore snapshots.

Usage:
    python scripts/enumerate_states.py email /path/to/profile -o output_dir
    python scripts/enumerate_states.py email test-profile-1 --verbose
"""

import sys
import os
import argparse
import logging
from pathlib import Path

# Add parent directory to path (to find scenarios module)
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import digiworld
from digiworld.scenarios.state_enumerator import StateEnumerator
from digiworld.app_registry import get_app_to_bundle_mapping


def setup_logging(verbose: bool = False):
    """Set up logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def get_app_to_apk_mapping():
    """Get mapping of app names to APK package names"""
    return get_app_to_bundle_mapping()


def resolve_profile_path(profile_ref: str, app_name: str) -> tuple[str, str]:
    """
    Resolve a profile reference to an absolute path.
    
    Args:
        profile_ref: Profile name or path
        app_name: App name for constructing default path
    
    Returns:
        Tuple of (absolute_path, profile_name)
    """
    # If it's already an absolute path, use it
    if os.path.isabs(profile_ref) and os.path.exists(profile_ref):
        # Extract profile name from path
        profile_name = os.path.basename(profile_ref)
        return profile_ref, profile_name
    
    # Try as relative path
    if os.path.exists(profile_ref):
        profile_name = os.path.basename(os.path.abspath(profile_ref))
        return os.path.abspath(profile_ref), profile_name
    
    # Try to find in standard locations
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    
    # Get APK name
    app_to_apk = get_app_to_apk_mapping()
    apk_name = app_to_apk.get(app_name, f'com.andojo{app_name}.sbx')
    
    # Try different standard locations
    state_data_path = digiworld.get_state_data_path().rstrip('/')
    possible_paths = [
        # digiworld package state_data/
        os.path.join(state_data_path, apk_name, profile_ref),
        # python-agent-to-app-interaction-api/data/
        os.path.join(base_dir, 'python-agent-to-app-interaction-api', 'data', apk_name, profile_ref),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path, profile_ref
    
    # If nothing found, raise error
    raise FileNotFoundError(
        f"Could not find profile '{profile_ref}'. Tried:\n" +
        "\n".join(f"  - {p}" for p in possible_paths)
    )


def get_default_output_path(app_name: str, profile_name: str) -> str:
    """
    Get default output path that mirrors state_data structure.
    
    Args:
        app_name: App name (e.g., 'email')
        profile_name: Profile name (e.g., 'test-profile-1')
    
    Returns:
        Path like: ui_states/com.andojomail.sbx/test-profile-1/
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    app_to_apk = get_app_to_apk_mapping()
    apk_name = app_to_apk.get(app_name, f'com.andojo{app_name}.sbx')
    
    return os.path.join(base_dir, 'digiworld', 'ui_states', apk_name, profile_name)


def main():
    parser = argparse.ArgumentParser(
        description='Enumerate all possible UI states for an app',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Enumerate all states for email app, test-profile-1
  python scripts/enumerate_states.py email test-profile-1
  
  # Write rootstore files to output directory
  python scripts/enumerate_states.py email test-profile-1 -o ./email_states
  
  # Use full path to profile
  python scripts/enumerate_states.py email /path/to/com.andojomail.sbx/test-profile-1
  
  # Exclude dynamic routes (routes with IDs)
  python scripts/enumerate_states.py email test-profile-1 --no-dynamic
  
  # Verbose output
  python scripts/enumerate_states.py email test-profile-1 -v
        """
    )
    
    parser.add_argument(
        'app_name',
        help='Name of the app (e.g., email, payment, message)'
    )
    parser.add_argument(
        'profile',
        help='Profile name (e.g., test-profile-1) or full path to profile directory'
    )
    parser.add_argument(
        '-o', '--output',
        dest='output_dir',
        help='Output directory for rootstore JSON files (default: ui_states/{apk_name}/{profile_name}/)',
        default=None
    )
    parser.add_argument(
        '--no-dynamic',
        action='store_true',
        help='Exclude dynamic routes (routes with variable IDs like /screens/mail/[id])'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose debug logging'
    )
    parser.add_argument(
        '--list-routes',
        action='store_true',
        help='List available routes and exit'
    )
    
    args = parser.parse_args()
    
    # Set up logging
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)
    
    try:
        # Create enumerator
        enumerator = StateEnumerator(args.app_name, logger=logger)
        
        # If just listing routes, do that and exit
        if args.list_routes:
            print(f"\nAvailable routes for {args.app_name}:")
            for route in enumerator.config['routes']:
                dynamic = " (dynamic)" if route.get('dynamic') else ""
                print(f"  [{route['id']}] {route['route']}{dynamic}")
                print(f"      {route['description']}")
                if route.get('context_variations'):
                    print(f"      {len(route['context_variations'])} context variations")
            return 0
        
        # Resolve profile path
        profile_path, profile_name = resolve_profile_path(args.profile, args.app_name)
        logger.info(f"Using profile: {profile_path}")
        
        # Determine output directory
        output_dir = args.output_dir
        if output_dir is None:
            # Use default structure: ui_states/apk_name/profile_name/
            output_dir = get_default_output_path(args.app_name, profile_name)
            logger.info(f"Using default output: {output_dir}")
        
        # Enumerate states
        print(f"\nEnumerating UI states for {args.app_name}...")
        states = enumerator.enumerate_states(
            profile_path=profile_path,
            output_dir=output_dir,
            include_dynamic=not args.no_dynamic
        )
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"Generated {len(states)} UI states")
        print(f"{'='*60}\n")
        
        # Group by route
        route_groups = {}
        for state in states:
            route_id = state['route_id'].rsplit('_', 1)[0]  # Remove position suffix
            if route_id not in route_groups:
                route_groups[route_id] = []
            route_groups[route_id].append(state)
        
        for route_id, route_states in sorted(route_groups.items()):
            print(f"{route_id}: {len(route_states)} state(s)")
            for state in route_states[:3]:  # Show first 3
                context_str = ", ".join(f"{k}={v}" for k, v in state['context'].items() if k != 'position')
                if state.get('metadata', {}).get('position'):
                    context_str = f"position={state['metadata']['position']}" + (f", {context_str}" if context_str else "")
                print(f"  - {state['route']}" + (f" ({context_str})" if context_str else ""))
            if len(route_states) > 3:
                print(f"  ... and {len(route_states) - 3} more")
        
        if args.output_dir:
            print(f"\nRootstore files written to: {args.output_dir}")
            print(f"See {os.path.join(args.output_dir, '_state_summary.json')} for full details")
        
        return 0
    
    except FileNotFoundError as e:
        logger.error(str(e))
        return 1
    except ValueError as e:
        logger.error(str(e))
        return 1
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())


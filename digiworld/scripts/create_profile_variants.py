#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Create Profile Variants from UI States

This script creates profile variants that share the same database and mockdata
but have different rootstore.json files (different UI states).

Each variant is named: {base_profile}-{state_name}
And has symlinks to the original data, with only rootstore.json being different.

Usage:
    python scripts/create_profile_variants.py email test-profile-1
    python scripts/create_profile_variants.py email test-profile-1 --dry-run
    python scripts/create_profile_variants.py email test-profile-1 --states inbox_var0 inbox_var1
"""

import sys
import os
import json
import shutil
import argparse
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import digiworld
from digiworld.app_registry import get_app_to_bundle_mapping
from digiworld.profile_variants import write_variant_marker


def get_app_to_apk_mapping():
    """Get mapping of app names to APK package names"""
    return get_app_to_bundle_mapping()


def create_profile_variants(
    app_name: str,
    base_profile: str,
    output_dir: str = None,
    selected_states: list = None,
    dry_run: bool = False,
    logger: logging.Logger = None
):
    """
    Create profile variants from enumerated UI states.
    
    Args:
        app_name: App name (e.g., 'email')
        base_profile: Base profile name (e.g., 'test-profile-1')
        output_dir: Output directory (default: state_data/{apk_name}/)
        selected_states: List of specific states to create variants for (None = all)
        dry_run: If True, only show what would be created
        logger: Logger instance
    """
    logger = logger or logging.getLogger(__name__)
    
    # Get paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    state_data_path = digiworld.get_state_data_path().rstrip('/')
    app_to_apk = get_app_to_apk_mapping()
    apk_name = app_to_apk.get(app_name, f'com.andojo{app_name}.sbx')
    
    # Base profile path
    base_profile_path = os.path.join(state_data_path, apk_name, base_profile)
    
    if not os.path.exists(base_profile_path):
        raise FileNotFoundError(f"Base profile not found: {base_profile_path}")
    
    # UI states path (sibling to state_data in package dir)
    package_dir = digiworld.get_package_dir()
    ui_states_path = os.path.join(package_dir, 'ui_states', apk_name, base_profile)
    
    if not os.path.exists(ui_states_path):
        raise FileNotFoundError(
            f"UI states not found for {base_profile}. "
            f"Run: python scripts/enumerate_states.py {app_name} {base_profile}"
        )
    
    # Output directory
    if output_dir is None:
        output_dir = os.path.join(state_data_path, apk_name)
    
    # Load state summary
    summary_file = os.path.join(ui_states_path, '_state_summary.json')
    if not os.path.exists(summary_file):
        raise FileNotFoundError(f"State summary not found: {summary_file}")
    
    with open(summary_file, 'r') as f:
        state_summary = json.load(f)
    
    # Filter states if specified
    if selected_states:
        state_summary = [s for s in state_summary if s['filename'].replace('.json', '') in selected_states]
    
    logger.info(f"Creating {len(state_summary)} profile variants for {base_profile}")
    
    created_variants = []
    
    for state_info in state_summary:
        filename = state_info['filename']
        state_name = filename.replace('.json', '')
        
        # Skip the summary file itself
        if state_name.startswith('_'):
            continue
        
        # Create variant profile name
        variant_name = f"{base_profile}-{state_name}"
        variant_path = os.path.join(output_dir, variant_name)
        
        if dry_run:
            logger.info(f"Would create: {variant_name}")
            logger.info(f"  Route: {state_info['route']}")
            logger.info(f"  Context: {state_info['context']}")
            continue
        
        # Create variant directory structure
        logger.info(f"Creating variant: {variant_name}")
        
        # Create directories
        sessions_dir = os.path.join(variant_path, 'sessions', 'default')
        os.makedirs(sessions_dir, exist_ok=True)
        
        # Create symlink to mockdata
        mockdata_src = os.path.join(base_profile_path, 'mockdata')
        mockdata_dst = os.path.join(variant_path, 'mockdata')
        
        if os.path.exists(mockdata_src):
            if not os.path.exists(mockdata_dst):
                # Create relative symlink
                rel_path = os.path.relpath(mockdata_src, variant_path)
                os.symlink(rel_path, mockdata_dst)
                logger.debug(f"  Created symlink: mockdata -> {rel_path}")
        
        # Create symlink to database
        db_files = []
        base_sessions = os.path.join(base_profile_path, 'sessions', 'default')
        if os.path.exists(base_sessions):
            for db_file in os.listdir(base_sessions):
                if db_file.endswith('.db'):
                    db_files.append(db_file)
        
        for db_file in db_files:
            db_src = os.path.join(base_profile_path, 'sessions', 'default', db_file)
            db_dst = os.path.join(sessions_dir, db_file)
            
            if not os.path.exists(db_dst):
                # Create relative symlink
                rel_path = os.path.relpath(db_src, sessions_dir)
                os.symlink(rel_path, db_dst)
                logger.debug(f"  Created symlink: {db_file} -> {rel_path}")
        
        # Copy the rootstore.json from ui_states
        rootstore_src = os.path.join(ui_states_path, filename)
        rootstore_dst = os.path.join(sessions_dir, 'rootstore.json')
        
        shutil.copy2(rootstore_src, rootstore_dst)
        logger.debug(f"  Copied rootstore: {filename}")
        
        # Symlink theme.json from base profile so set_environment() finds it
        theme_src = os.path.join(base_profile_path, 'theme.json')
        theme_dst = os.path.join(variant_path, 'theme.json')
        if os.path.exists(theme_src) and not os.path.exists(theme_dst):
            rel_path = os.path.relpath(theme_src, variant_path)
            os.symlink(rel_path, theme_dst)
            logger.debug(f"  Created symlink: theme.json -> {rel_path}")
        
        write_variant_marker(variant_path, base_profile,
                             variant_type="ui_state", variant_detail=state_name)
        logger.debug(f"  Wrote variant marker: base_profile={base_profile}")
        
        created_variants.append({
            'name': variant_name,
            'path': variant_path,
            'route': state_info['route'],
            'state': state_name
        })
    
    return created_variants


def main():
    parser = argparse.ArgumentParser(
        description='Create profile variants from enumerated UI states',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create all variants for test-profile-1
  python scripts/create_profile_variants.py email test-profile-1
  
  # Dry run to see what would be created
  python scripts/create_profile_variants.py email test-profile-1 --dry-run
  
  # Create only specific state variants
  python scripts/create_profile_variants.py email test-profile-1 --states inbox_var0 inbox_var2
  
  # Custom output directory
  python scripts/create_profile_variants.py email test-profile-1 -o ./custom_profiles
        """
    )
    
    parser.add_argument(
        'app_name',
        help='Name of the app (e.g., email, payment)'
    )
    parser.add_argument(
        'base_profile',
        help='Base profile name (e.g., test-profile-1)'
    )
    parser.add_argument(
        '-o', '--output',
        dest='output_dir',
        help='Output directory for variant profiles (default: state_data/{apk_name}/)',
        default=None
    )
    parser.add_argument(
        '--states',
        nargs='+',
        help='Create only specific state variants (e.g., inbox_var0 inbox_var1)',
        default=None
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be created without actually creating'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose debug logging'
    )
    
    args = parser.parse_args()
    
    # Set up logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    try:
        variants = create_profile_variants(
            app_name=args.app_name,
            base_profile=args.base_profile,
            output_dir=args.output_dir,
            selected_states=args.states,
            dry_run=args.dry_run,
            logger=logger
        )
        
        if not args.dry_run:
            print(f"\n{'='*60}")
            print(f"Created {len(variants)} profile variants")
            print(f"{'='*60}\n")
            
            # Group by route pattern
            route_groups = {}
            for v in variants:
                route_base = v['route'].split('/')[0:3]
                route_key = '/'.join(route_base) if route_base else 'root'
                if route_key not in route_groups:
                    route_groups[route_key] = []
                route_groups[route_key].append(v)
            
            for route_key, group in sorted(route_groups.items()):
                print(f"{route_key}: {len(group)} variant(s)")
                for v in group[:3]:
                    print(f"  - {v['name']}")
                if len(group) > 3:
                    print(f"  ... and {len(group) - 3} more")
            
            print(f"\nVariant profiles created in:")
            if variants:
                base_path = os.path.dirname(variants[0]['path'])
                print(f"  {base_path}")
        
        return 0
    
    except FileNotFoundError as e:
        logger.error(str(e))
        return 1
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())


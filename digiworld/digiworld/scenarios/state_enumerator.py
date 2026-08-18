# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
State Enumerator - Generate all possible UI states for an app

This module provides functionality to enumerate all valid UI states for an app,
generating rootstore.json files that point to each unique state position.
"""

import json
import os
import sqlite3
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import uuid
import logging
logger = logging.getLogger(__name__)

from digiworld.scenarios.positioning_service import PositioningService, PositioningConfig, Position


class StateEnumerator:
    """Enumerate all possible UI states for an app"""
    
    def __init__(
        self,
        app_name: str,
        config_path: Optional[str] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialize state enumerator for a given app.
        
        Args:
            app_name: Name of the app (e.g., 'email', 'payment')
            config_path: Optional path to state enumeration config JSON
                        If not provided, looks for scenarios/scenarios/{app_name}/state_enumeration.json
            logger: Optional logger instance
        """
        self.app_name = app_name
        self.logger = logger or logging.getLogger(__name__)
        
        # Load configuration from app-specific directory
        if config_path is None:
            # Look for config in app's scenario directory
            config_path = os.path.join(
                os.path.dirname(__file__),
                'scenarios',
                app_name,
                'state_enumeration.json'
            )
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(
                f"No state enumeration config found for app '{app_name}' at: {config_path}\n"
                f"Expected location: scenarios/scenarios/{app_name}/state_enumeration.json"
            )
        
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.apk_name = self.config['apk_name']
        self.database_name = self.config.get('database_name', 'default.db')
    
    def enumerate_states(
        self,
        profile_path: str,
        output_dir: Optional[str] = None,
        include_dynamic: bool = True
    ) -> List[Dict]:
        """
        Generate all valid UI state configurations for a profile.
        
        Args:
            profile_path: Path to the profile directory (e.g., test-profile-1)
            output_dir: Optional directory to write rootstore files to
            include_dynamic: Whether to include dynamic routes (with IDs)
        
        Returns:
            List of state dictionaries, each containing:
                - route_id: Identifier for the route
                - route: The actual route path
                - screen_name: Screen name for session tracking
                - context: Context data for this state
                - rootstore: The generated rootstore.json content
                - metadata: Additional metadata about this state
        """
        self.logger.info(f"Enumerating states for {self.app_name} in {profile_path}")
        
        # Load user data from profile
        user_data = self._load_user_data(profile_path)
        if not user_data:
            raise ValueError(f"Could not load user data from {profile_path}")

        # Only look up the database if we need it for dynamic routes
        has_dynamic = include_dynamic and any(
            r.get('dynamic', False) for r in self.config['routes']
        )
        db_path = self._get_database_path(profile_path) if has_dynamic else None

        states = []

        # Enumerate each route
        for route_config in self.config['routes']:
            if route_config.get('dynamic', False) and not include_dynamic:
                continue

            route_states = self._enumerate_route_states(
                route_config,
                user_data,
                db_path
            )
            states.extend(route_states)
        
        self.logger.info(f"Generated {len(states)} total states")
        
        # Optionally write to files
        if output_dir:
            self._write_state_files(states, output_dir)
        
        return states
    
    def _enumerate_route_states(
        self,
        route_config: Dict,
        user_data: Dict,
        db_path: str
    ) -> List[Dict]:
        """Enumerate all state variations for a single route"""
        states = []
        route_id = route_config['id']
        home_route = self.config.get('home_route')
        back_route = route_config.get('back_route')

        # Handle dynamic routes (with variable IDs)
        if route_config.get('dynamic', False):
            dynamic_states = self._enumerate_dynamic_route(
                route_config,
                user_data,
                db_path
            )
            states.extend(dynamic_states)
        else:
            # Static route - enumerate context variations
            context_variations = route_config.get('context_variations', [{}])

            if not context_variations:
                context_variations = [{}]

            for idx, context in enumerate(context_variations):
                state = self._generate_state(
                    route_id=route_id,
                    route=route_config['route'],
                    screen_name=route_config['screen_name'],
                    context=context,
                    user_data=user_data,
                    variation_index=idx,
                    home_route=home_route,
                    back_route=back_route,
                )
                states.append(state)

        return states
    
    def _enumerate_dynamic_route(
        self,
        route_config: Dict,
        user_data: Dict,
        db_path: str
    ) -> List[Dict]:
        """Enumerate states for dynamic routes with positioned IDs"""
        states = []
        dynamic_config = route_config['dynamic_config']
        
        # Set up positioning service
        positioning_config = PositioningConfig(
            table_name=dynamic_config['table'],
            timestamp_column=dynamic_config['timestamp_column'],
            filter_column=dynamic_config.get('filter_column'),
            filter_pattern=dynamic_config.get('filter_pattern')
        )
        
        positioning_service = PositioningService(
            app_config=positioning_config,
            debug=False,
            logger=self.logger
        )
        
        user_email = user_data['currentUser']['email']
        
        # For each position, get a record ID
        positions = dynamic_config.get('positions', ['beginning', 'middle', 'end'])
        
        for position in positions:
            try:
                # Get a record at this position
                record_id = self._get_record_at_position(
                    db_path=db_path,
                    table=dynamic_config['table'],
                    id_column=dynamic_config['id_column'],
                    timestamp_column=dynamic_config['timestamp_column'],
                    filter_column=dynamic_config.get('filter_column'),
                    filter_pattern=dynamic_config.get('filter_pattern'),
                    user_email=user_email,
                    position=position
                )
                
                if record_id is None:
                    self.logger.warning(
                        f"No record found at position '{position}' for {route_config['id']}"
                    )
                    continue
                
                # Generate actual route with ID
                route_template = route_config['route']
                actual_route = route_template.replace('[id]', str(record_id))
                
                # Enumerate context variations for this positioned route
                context_variations = route_config.get('context_variations', [{}])
                if not context_variations:
                    context_variations = [{}]
                
                for ctx_idx, base_context in enumerate(context_variations):
                    # Add positioning metadata to context
                    context = {
                        **base_context,
                        'messageID': str(record_id),
                        'position': position
                    }

                    state = self._generate_state(
                        route_id=f"{route_config['id']}_{position}",
                        route=actual_route,
                        screen_name=route_config['screen_name'],
                        context=context,
                        user_data=user_data,
                        variation_index=ctx_idx,
                        metadata={'position': position, 'record_id': record_id},
                        home_route=self.config.get('home_route'),
                        back_route=route_config.get('back_route'),
                    )
                    states.append(state)
            
            except Exception as e:
                raise RuntimeError(
                    f"Failed to enumerate position '{position}' for {route_config['id']}: {e}"
                ) from e
        
        return states
    
    def _get_record_at_position(
        self,
        db_path: str,
        table: str,
        id_column: str,
        timestamp_column: str,
        filter_column: Optional[str],
        filter_pattern: Optional[str],
        user_email: str,
        position: str
    ) -> Optional[int]:
        """Get a record ID at a specific position (beginning, middle, end)"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Build query
            if filter_column and filter_pattern:
                pattern = filter_pattern.format(user_email=user_email)
                query = f"""
                    SELECT {id_column}, {timestamp_column}
                    FROM {table}
                    WHERE {filter_column} LIKE ?
                    ORDER BY {timestamp_column} ASC
                """
                cursor.execute(query, (pattern,))
            else:
                query = f"""
                    SELECT {id_column}, {timestamp_column}
                    FROM {table}
                    ORDER BY {timestamp_column} ASC
                """
                cursor.execute(query)
            
            records = cursor.fetchall()
            conn.close()
            
            if not records:
                return None
            
            # Select record based on position
            if position == 'beginning':
                # Most recent (last in sorted order)
                return records[-1][0]
            elif position == 'middle':
                # Middle record
                mid_idx = len(records) // 2
                return records[mid_idx][0]
            elif position == 'end':
                # Oldest (first in sorted order)
                return records[0][0]
            else:
                raise ValueError(f"Unknown position: {position}")
        
        except Exception as e:
            raise RuntimeError(f"Error getting record at position '{position}': {e}") from e
    
    def _generate_state(
        self,
        route_id: str,
        route: str,
        screen_name: str,
        context: Dict,
        user_data: Dict,
        variation_index: int = 0,
        metadata: Optional[Dict] = None,
        home_route: Optional[str] = None,
        back_route: Optional[str] = None,
    ) -> Dict:
        """Generate a complete state definition with rootstore"""
        timestamp = int(datetime.now().timestamp() * 1000)
        session_id = f"state-{route_id}-{variation_index}"

        # Build session data
        session_data = {
            'screenName': screen_name,
            'route': route,
            'startTime': timestamp,
            'endTime': 0,
            'sessionData': {
                'interactionType': 'SCREEN_MOUNTED',
                'currentFocusedElement': '',
                'formData': {
                    'screen': screen_name,
                    'route': route,
                    **context
                }
            },
            'action': '',
            'timestamp': timestamp
        }

        # Build rootstore
        rootstore = {
            'timestamp': timestamp,
            'sessionStore': {
                'session': {
                    'id': session_id,
                    'data': session_data
                }
            },
            'userStore': user_data,
            'uiStore': {
                'isDeeplinkLoading': False,
                'storagePermissionUri': None
            }
        }

        # Add navigation routing fields when available
        if home_route is not None:
            rootstore['homeRoute'] = home_route
        if back_route is not None:
            rootstore['backRoute'] = back_route

        # Build complete state object
        state = {
            'route_id': route_id,
            'route': route,
            'screen_name': screen_name,
            'context': context,
            'variation_index': variation_index,
            'rootstore': rootstore,
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'session_id': session_id,
                **(metadata or {})
            }
        }

        return state
    
    def _load_user_data(self, profile_path: str) -> Optional[Dict]:
        """Load user data from profile's rootstore"""
        # Try to load from an existing rootstore in default session
        default_rootstore = os.path.join(
            profile_path,
            'sessions',
            'default',
            'rootstore.json'
        )
        
        if os.path.exists(default_rootstore):
            with open(default_rootstore, 'r') as f:
                rootstore = json.load(f)
                return rootstore.get('userStore')
        
        # Fallback: try to load from mock-users.json
        users_file = os.path.join(profile_path, 'mockdata', 'mock-users.json')
        if os.path.exists(users_file):
            with open(users_file, 'r') as f:
                users = json.load(f)
                if users and len(users) > 0:
                    user = users[0]
                    return {
                        'currentUser': user,
                        'authToken': 'dummy-jwt-token-1'
                    }
        
        return None
    
    def _get_database_path(self, profile_path: str) -> str:
        """Get the database path for the profile"""
        # Try common database locations and names
        possible_locations = [
            # Session default directory
            ('sessions/default', self.database_name),
            ('sessions/default', 'email.db'),
            ('sessions/default', 'id.db'),
            # Profile root
            ('', self.database_name),
            ('', 'email.db'),
            ('', 'id.db'),
            # Mockdata directory (some apps)
            ('mockdata', self.database_name),
        ]
        
        for subdir, db_name in possible_locations:
            db_path = os.path.join(profile_path, subdir, db_name) if subdir else os.path.join(profile_path, db_name)
            if os.path.exists(db_path):
                self.logger.debug(f"Found database at: {db_path}")
                return db_path
        
        raise FileNotFoundError(
            f"Database not found in {profile_path}. Tried: {[os.path.join(profile_path, s, n) if s else os.path.join(profile_path, n) for s, n in possible_locations]}"
        )
    
    def _write_state_files(self, states: List[Dict], output_dir: str):
        """Write rootstore files for each state to output directory"""
        os.makedirs(output_dir, exist_ok=True)
        
        for state in states:
            # Create filename from route_id and variation
            filename = f"{state['route_id']}_var{state['variation_index']}.json"
            filepath = os.path.join(output_dir, filename)
            
            # Write rootstore
            with open(filepath, 'w') as f:
                json.dump(state['rootstore'], f, indent=2)
            
            self.logger.debug(f"Wrote state to {filepath}")
        
        # Also write a summary file
        summary_file = os.path.join(output_dir, '_state_summary.json')
        summary = [
            {
                'filename': f"{s['route_id']}_var{s['variation_index']}.json",
                'route_id': s['route_id'],
                'route': s['route'],
                'screen_name': s['screen_name'],
                'context': s['context'],
                'back_route': s['rootstore'].get('backRoute'),
                'metadata': s['metadata']
            }
            for s in states
        ]
        
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"Wrote {len(states)} state files to {output_dir}")
        self.logger.info(f"Summary written to {summary_file}")


def enumerate_app_states(
    app_name: str,
    profile_path: str,
    output_dir: Optional[str] = None,
    include_dynamic: bool = True,
    verbose: bool = False
) -> List[Dict]:
    """
    Convenience function to enumerate states for an app.
    
    Args:
        app_name: Name of the app (e.g., 'email')
        profile_path: Path to profile directory
        output_dir: Optional directory to write rootstore files
        include_dynamic: Whether to include dynamic routes
        verbose: Enable verbose logging
    
    Returns:
        List of generated states
    """
    # Set up logging
    logger = logging.getLogger('state_enumerator')
    if verbose:
        logger.setLevel(logging.DEBUG)
        handler = logging.StreamHandler()
        handler.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    # Create enumerator and run
    enumerator = StateEnumerator(app_name, logger=logger)
    states = enumerator.enumerate_states(
        profile_path=profile_path,
        output_dir=output_dir,
        include_dynamic=include_dynamic
    )
    
    return states


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Enumerate all possible UI states for an app'
    )
    parser.add_argument(
        'app_name',
        help='Name of the app (e.g., email, payment)'
    )
    parser.add_argument(
        'profile_path',
        help='Path to the profile directory'
    )
    parser.add_argument(
        '-o', '--output',
        help='Output directory for rootstore files',
        default=None
    )
    parser.add_argument(
        '--no-dynamic',
        action='store_true',
        help='Exclude dynamic routes (routes with variable IDs)'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    states = enumerate_app_states(
        app_name=args.app_name,
        profile_path=args.profile_path,
        output_dir=args.output,
        include_dynamic=not args.no_dynamic,
        verbose=args.verbose
    )
    
    logger.info(f"\nGenerated {len(states)} states")
    logger.info("\nState summary:")
    for state in states:
        logger.info(f"  - {state['route_id']}: {state['route']}")
        if state.get('metadata', {}).get('position'):
            logger.info(f"    Position: {state['metadata']['position']}")


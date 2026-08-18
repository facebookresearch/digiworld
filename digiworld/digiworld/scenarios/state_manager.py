# Copyright (c) Meta Platforms, Inc. and affiliates.
"""State management and database operations for scenarios."""

import os
import sqlite3
import json
import shutil
import uuid
from typing import List, Tuple, Optional
import logging

# Create logger for this module
logger = logging.getLogger(__name__)


class StateManager:
    """Handles state management and database operations."""
    
    def __init__(self, scenario_instance):
        """
        Initialize the state manager.
        
        Args:
            scenario_instance: The scenario instance to manage states for
        """
        self.scenario = scenario_instance
    
    def connect_to_db(self, db_path: str) -> sqlite3.Connection:
        """Connect to the SQLite database."""
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Error: The file '{db_path}' does not exist.")
        return sqlite3.connect(db_path)

    def execute_query(self, db_path: str, query: str, params: Tuple = ()) -> List:
        """Execute a SQL query on the database."""
        conn = self.connect_to_db(db_path)
        cursor = conn.cursor()
        cursor.execute(query, params)
        results = cursor.fetchall()
        conn.close()
        return results

    def execute_query_in_path(self, query: str, params: Tuple, state_path: str) -> List:
        """Execute a SQL query on the database within a specific state path."""
        state_db_path = os.path.join(state_path, f"{os.path.basename(state_path)}.db")
        if not os.path.exists(state_db_path):
            raise FileNotFoundError(f"Error: The file '{state_db_path}' does not exist.")
        
        conn = sqlite3.connect(state_db_path)
        cursor = conn.cursor()
        cursor.execute(query, params)
        results = cursor.fetchall()
        conn.close()
        return results

    def get_current_user_info(self, json_path: str) -> Tuple[Optional[str], Optional[str]]:
        """Get the current user's ID and email from the JSON store."""
        with open(json_path, 'r') as file:
            data = json.load(file)
            user_store = data.get("userStore", {}).get("currentUser") or {}
            user_id = user_store.get("id")
            # Try email first, fallback to phoneNumber for apps that use phone-based auth
            email = user_store.get("email") or user_store.get("phoneNumber")
            return user_id, email
    
    def create_new_state_from(self, source_state_id: str, base_path: str) -> str:
        """
        Create a new state by duplicating an existing state.
        
        Args:
            source_state_id: The ID of the state to duplicate.
            base_path: The base path where states are stored.
            
        Returns:
            str: The ID of the newly created state.
        """
        new_state_id = str(uuid.uuid4())
        
        source_path = os.path.join(base_path, source_state_id)
        new_path = os.path.join(base_path, new_state_id)
        
        os.makedirs(new_path, exist_ok=True)
        
        # Copy the database
        source_db = os.path.join(source_path, f"{source_state_id}.db")
        new_db = os.path.join(new_path, f"{new_state_id}.db")
        shutil.copy2(source_db, new_db)
        
        # Copy the JSON state if it exists
        source_json = os.path.join(source_path, f"rootstore.json")
        if os.path.exists(source_json):
            new_json = os.path.join(new_path, f"rootstore.json")
            shutil.copy2(source_json, new_json)
            
            with open(new_json, 'r') as file:
                data = json.load(file)
            
            if 'state_id' in data:
                data['state_id'] = new_state_id
            
            with open(new_json, 'w') as file:
                json.dump(data, file, indent=2)
        
        return new_state_id

    def compare_database_records(self, state_1_path: str, state_2_path: str, query: str, params: Tuple):
        """
        Compare database records between two states.
        
        Args:
            state_1_path: The path to the first state database.
            state_2_path: The path to the second state database.
            query: SQL query to execute.
            params: Parameters for the SQL query.
            
        Returns:
            tuple: Sets of initial and current records, and their difference.
        """
        logger.info(f"Comparing database records between {state_1_path} and {state_2_path}")
        # Get data from initial state first, then close
        initial_conn = sqlite3.connect(state_1_path)
        try:
            initial_cursor = initial_conn.cursor()
            initial_cursor.execute(query, params)
            initial_records = set(tuple(row) for row in initial_cursor.fetchall())
        finally:
            initial_conn.close()
        
        # Get data from current state second, then close
        current_conn = sqlite3.connect(state_2_path)
        try:
            current_cursor = current_conn.cursor()
            current_cursor.execute(query, params)
            current_records = set(tuple(row) for row in current_cursor.fetchall())
        finally:
            current_conn.close()
        
        # Calculate new records
        new_records = current_records - initial_records
        
        return initial_records, current_records, new_records

    def filter_db_write_actions(self, state_paths: List[str]) -> List[str]:
        """
        Filter a trajectory to only keep states that differ from the previous state.
        This filters out read-only actions, keeping only write actions that changed the database.
        
        Args:
            state_paths: A list of state paths representing the full trajectory.

        Returns:
            List[str]: Filtered list containing only states that represent write actions.
        """
        if len(state_paths) < 2:
            return []
        
        # Always keep the first state
        filtered_states = [state_paths[0]]

        for i in range(1, len(state_paths)):
            current_state_path = state_paths[i]
            prev_state_path = state_paths[i-1]

            # Compare database files to detect changes
            current_db_path = self._normalize_state_path_or_id(current_state_path)
            prev_db_path = self._normalize_state_path_or_id(prev_state_path)

            if not os.path.exists(current_db_path) or not os.path.exists(prev_db_path):
                filtered_states.append(current_state_path)
                continue
            
            # Connect to both databases
            current_conn = sqlite3.connect(current_db_path)
            prev_conn = sqlite3.connect(prev_db_path)
            
            # Get list of tables in current database
            current_cursor = current_conn.cursor()
            current_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            current_tables = set(table[0] for table in current_cursor.fetchall())
            
            # Get list of tables in previous database
            prev_cursor = prev_conn.cursor()
            prev_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            prev_tables = set(table[0] for table in prev_cursor.fetchall())
            
            # If table sets are different, it's a change
            if current_tables != prev_tables:
                filtered_states.append(current_state_path)
                continue
            
            # Check content of each table
            has_changes = False
            for table in current_tables:
                if table.startswith('sqlite_'):
                    continue
                
                current_cursor.execute(f"SELECT * FROM {table} ORDER BY rowid;")
                current_content = current_cursor.fetchall()
                
                prev_cursor.execute(f"SELECT * FROM {table} ORDER BY rowid;")
                prev_content = prev_cursor.fetchall()
                
                if current_content != prev_content:
                    has_changes = True
                    break
            
            if has_changes:
                filtered_states.append(current_state_path)

            # Close connections
            current_conn.close()
            prev_conn.close()
        
        return filtered_states[1:]
    
    def _normalize_state_path_or_id(self, state_path_or_id: str) -> str:
        """Normalize state path or id to a database file path."""
        if state_path_or_id.endswith('.db'):
            return state_path_or_id
        elif os.path.isdir(state_path_or_id):
            return os.path.join(state_path_or_id, f"{os.path.basename(state_path_or_id)}.db")
        else:
            # State ID - construct full path
            return os.path.join(
                self.scenario.base_path,
                self.scenario.apk_name,
                self.scenario.profile_name,
                "sessions",
                state_path_or_id,
                f"{state_path_or_id}.db"
            )

    def state_ids_to_paths(self, state_ids: List[str]) -> List[str]:
        """
        Convert a sequence of state IDs to full state directory paths for verification.
        
        Args:
            state_ids: A list of state IDs (session names)
            
        Returns:
            List[str]: Full paths to state directories
        """
        state_paths = []
        for state_id in state_ids:
            state_path = os.path.join(
                self.scenario.base_path,
                self.scenario.apk_name,
                self.scenario.profile_name,
                "sessions",
                state_id
            )
            state_paths.append(state_path)
        return state_paths


# Copyright (c) Meta Platforms, Inc. and affiliates.
INITIAL_PROFILE = 'test-profile-1'

import argparse
import json
import os
import sys
import time
import sqlite3

import digiworld
from adb_actions import ADBActions
from emulator_backends import ADBBackend, GenymotionBackend

def reset_to_default(adb_actions, profile):
    # Reset to the initial default state, the one included in the profile
    adb_actions.set_environment(data_id=profile)
    adb_actions.wait_for_ready()
    state_id = adb_actions.persist_state()
    return state_id

def load_scenario_data(adb_actions, mockdata_path):
    # Dump the database
    adb_actions.wait_for_ready()
    state_id = adb_actions.persist_state()
    # Load all json mock data files
    mock_data = {}
    json_files = [f for f in os.listdir(mockdata_path) if f.endswith('.json')]
    
    # Wait for the backup files to be created
    db_path = os.path.join(adb_actions.backup_dir, adb_actions.current_data_id, "sessions", state_id, f"{state_id}.db")
    max_wait = 30  # Maximum wait time in seconds
    wait_time = 0
    
    while not os.path.exists(db_path) and wait_time < max_wait:
        time.sleep(2)
        wait_time += 2
    
    if not os.path.exists(db_path):
        raise Exception(f"Backup file not created after {max_wait}s: {db_path}")


    for json_file in json_files:
        # Extract key from filename (e.g., "emails" from "mock-emails.json")
        key = json_file[5:-5]  # Remove "mock-" prefix and ".json" suffix
        
        with open(os.path.join(mockdata_path, json_file), 'r') as f:
            mock_data[key] = json.load(f)
    
    # Insert every element in the json in the corresponding table in the database   
    db_path = os.path.join(adb_actions.backup_dir, adb_actions.current_data_id, "sessions", state_id, f"{state_id}.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    def convert_to_snake_case(name):
        return ''.join(['_' + c.lower() if c.isupper() else c for c in name]).lstrip('_')
    
    for table_name, data in mock_data.items():
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    # Convert lists/dicts to JSON strings for storage
                    processed_item = {}
                    for key, value in item.items():
                        if isinstance(value, (list, dict)):
                            processed_item[key] = json.dumps(value)
                        else:
                            processed_item[key] = value
                    
                    # Try inserting with camelCase column names first
                    columns = list(processed_item.keys())
                    values = list(processed_item.values())
                    placeholders = ', '.join(['?'] * len(columns))
                    column_names = ', '.join(columns)
                    
                    # Get table schema to match column names correctly
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    table_columns = [row[1] for row in cursor.fetchall()]
                    
                    # Match JSON keys to database columns
                    matched_columns = []
                    matched_values = []
                    
                    for key, value in processed_item.items():
                        # Try exact match first
                        if key in table_columns:
                            matched_columns.append(key)
                            matched_values.append(value)
                        else:
                            # Try snake_case conversion
                            snake_case_key = convert_to_snake_case(key)
                            if snake_case_key in table_columns:
                                matched_columns.append(snake_case_key)
                                matched_values.append(value)
                            else:
                                print(f"Warning: Column '{key}' (or '{snake_case_key}') not found in table {table_name}")
                    
                    if matched_columns:
                        placeholders = ', '.join(['?'] * len(matched_columns))
                        column_names = ', '.join(matched_columns)
                        
                        try:
                            cursor.execute(f"INSERT OR IGNORE INTO {table_name} ({column_names}) VALUES ({placeholders})", matched_values)
                        except sqlite3.OperationalError as e:
                            print(f"Error inserting into {table_name}: {e}")
    conn.commit()
    conn.close()
    adb_actions.rollback_state(state_id)
    return state_id

def save_current_state(adb_actions):
    state_id = adb_actions.persist_state()
    return state_id


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Mock app interaction test with ADB or Genymotion actions')
    parser.add_argument('--action-type', choices=['adb', 'genymotion'], default='adb',
                        help='Choose between ADB or Genymotion actions (default: adb)')
    args = parser.parse_args()
    
    # Initialize ADBActions with the appropriate backend
    if args.action_type == 'genymotion':
        # Explicitly pass GenymotionBackend for Genymotion
        backend = GenymotionBackend(use_env_variables=True)
        adb_actions = ADBActions(bundle_id="com.andojomail.sbx", backend=backend, custom_path=digiworld.get_state_data_path())
        print("Using GenymotionBackend")
    else:
        # Use default ADBBackend (backward compatible - no backend parameter needed)
        adb_actions = ADBActions(bundle_id="com.andojomail.sbx", custom_path=digiworld.get_state_data_path())
        print("Using ADBBackend (default)")
    
    initial_state_id = reset_to_default(adb_actions, INITIAL_PROFILE)
    print(initial_state_id)
    state_id = load_scenario_data(adb_actions, 'demos/minimal_test/mocktest/mockdata')

    for i in range(3):
        adb_actions.wait_for_ready()
        state_id = save_current_state(adb_actions)
    adb_actions.rollback_state(initial_state_id)


if __name__ == "__main__":
    main()
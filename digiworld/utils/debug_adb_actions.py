#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Debug tool for testing ADB actions (set_environment, persist_state, rollback_state) on apps.
Useful for debugging state restoration issues.

Usage:
    python debug_adb_actions.py
"""

import sys
import os
import json
from pathlib import Path

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "python-agent-to-app-interaction-api"))
sys.path.insert(0, str(Path(__file__).parent.parent))

import digiworld
from digiworld.app_registry import get_display_names
from adb_actions import ADBActions


# App display names mapping (from centralized registry)
APP_DISPLAY_NAMES = get_display_names()


def discover_apps():
    """
    Automatically discover apps with scenarios by scanning the scenarios directory.
    Returns a dictionary mapping choice numbers to app info.
    """
    scenarios_dir = Path(__file__).parent.parent / "scenarios" / "scenarios"
    
    if not scenarios_dir.exists():
        print_error(f"Scenarios directory not found: {scenarios_dir}")
        return {}
    
    discovered_apps = {}
    choice_num = 1
    
    # Scan for app directories
    for app_dir in sorted(scenarios_dir.iterdir()):
        if not app_dir.is_dir() or app_dir.name.startswith('.') or app_dir.name.startswith('__'):
            continue
        
        # Look for app_config.json
        app_config_path = app_dir / "app_config.json"
        if not app_config_path.exists():
            continue
        
        try:
            with open(app_config_path, 'r') as f:
                config = json.load(f)
            
            app_name = config.get("app_name")
            # Use bundle_id if available, otherwise fall back to apk_name
            bundle_id = config.get("bundle_id") or config.get("apk_name")
            
            if not app_name or not bundle_id:
                continue
            
            # Get display name
            display_name = APP_DISPLAY_NAMES.get(app_name, app_name.capitalize())
            
            discovered_apps[str(choice_num)] = {
                "name": display_name,
                "app_name": app_name,
                "bundle_id": bundle_id
            }
            choice_num += 1
            
        except Exception as e:
            print(f"Warning: Could not load {app_config_path}: {e}")
            continue
    
    return discovered_apps


def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")


def print_info(text):
    print(f"[INFO] {text}")


def print_success(text):
    print(f"[SUCCESS] {text}")


def print_error(text):
    print(f"[ERROR] {text}")


def show_rootstore_summary(adb, profile):
    """Show a summary of the rootstore to verify user is logged in."""
    try:
        state_path = os.path.join(
            adb.backup_dir,
            profile,
            "sessions",
            "default",
            "rootstore.json"
        )
        
        if not os.path.exists(state_path):
            print_error(f"Rootstore not found at: {state_path}")
            return
        
        with open(state_path, 'r') as f:
            rootstore = json.load(f)
        
        print_info("Rootstore contents:")
        
        # Check for user info
        user_store = rootstore.get("userStore", {})
        current_user = user_store.get("currentUser") or user_store.get("user")
        
        if current_user:
            print(f"  User ID: {current_user.get('id')}")
            print(f"  Email: {current_user.get('email')}")
            print(f"  Username: {current_user.get('username', 'N/A')}")
            print_success("User is logged in in rootstore")
        else:
            print_error("No currentUser found in userStore!")
            print(f"  userStore keys: {list(user_store.keys())}")
        
        print(f"  Total rootstore size: {len(json.dumps(rootstore))} bytes")
        
    except Exception as e:
        print_error(f"Failed to read rootstore: {e}")


def test_set_environment(adb, profile="test-profile-1"):
    """Test setting environment."""
    print_header("Testing set_environment")
    print_info(f"Setting environment to: {profile}")
    
    adb.set_environment(data_id=profile)
    
    print_success(f"Environment set to: {adb.current_data_id}")
    
    # Show rootstore summary
    show_rootstore_summary(adb, profile)
    
    return True


def test_persist_state(adb):
    """Test persisting state."""
    print_header("Testing persist_state")
    
    if not adb.current_data_id:
        print_error("No environment set! Call set_environment first.")
        return None
    
    print_info("Persisting current app state...")
    
    session_id = adb.persist_state()
    
    print_success(f"State persisted with session ID: {session_id}")
    
    # Show session path
    session_path = os.path.join(
        adb.backup_dir,
        adb.current_data_id,
        "sessions",
        session_id
    )
    print_info(f"Session saved at: {session_path}")
    
    if os.path.exists(session_path):
        files = os.listdir(session_path)
        print_info(f"Session files: {files}")
    
    return session_id


def test_rollback_state(adb, session_id):
    """Test rolling back to a previous state."""
    print_header("Testing rollback_state")
    
    if not session_id:
        print_error("No session ID provided!")
        return False
    
    print_info(f"Rolling back to session: {session_id}")
    
    adb.rollback_state(session_id)
    
    print_success(f"Rolled back to session: {session_id}")
    
    return True


def check_app_on_device(adb):
    """Check if the app is running and can be accessed."""
    print_header("Checking app on device")
    
    print_info(f"Bundle ID: {adb.bundle_id}")
    
    try:
        print_info("Checking if app is ready...")
        adb._wait_for_app_ready(timeout=5, poll_interval=1)
        print_success("App is ready and responding!")
        return True
    except Exception as e:
        print_error(f"App check failed: {e}")
        print_info("Make sure:")
        print("  1. Emulator is running")
        print("  2. App is installed")
        print("  3. App is opened (at least once)")
        return False


def interactive_menu():
    """Interactive menu for testing."""
    print_header("ADB Actions Debug Tool")
    
    # Discover apps automatically
    print_info("Discovering apps with scenarios...")
    apps = discover_apps()
    
    if not apps:
        print_error("No apps found! Make sure scenario directories exist with app_config.json files.")
        return
    
    print_success(f"Found {len(apps)} apps")
    
    # Select app
    print("\nSelect an app to test:")
    for key, app in apps.items():
        print(f"  {key}. {app['name']}")
    
    choice = input(f"\nEnter choice (1-{len(apps)}): ").strip()
    
    if choice not in apps:
        print_error("Invalid choice!")
        return
    
    app = apps[choice]
    print_info(f"Selected: {app['name']} ({app['bundle_id']})")
    
    # Get state_data path from digiworld package
    state_data_path = digiworld.get_state_data_path()
    
    print_info(f"Using state_data path: {state_data_path}")
    
    # Initialize ADB
    print_info("Initializing ADBActions...")
    
    adb = ADBActions(
        bundle_id=app['bundle_id'],
        custom_path=state_data_path
    )
    
    print_success("ADBActions initialized!")
    
    # Check app on device
    if not check_app_on_device(adb):
        print("\nWould you like to continue anyway? (y/n): ", end="")
        if input().strip().lower() != 'y':
            return
    
    session_id = None
    
    # Interactive loop
    while True:
        print_header("Actions Menu")
        print("1. Set Environment (set_environment)")
        print("2. Persist State (persist_state)")
        print("3. Rollback State (rollback_state)")
        print("4. Check Rootstore")
        print("5. Full Test (set -> persist -> rollback)")
        print("6. Switch App")
        print("7. Exit")
        
        action = input("\nSelect action: ").strip()
        
        if action == "1":
            profile = input("Enter profile (default: test-profile-1): ").strip() or "test-profile-1"
            test_set_environment(adb, profile)
        
        elif action == "2":
            session_id = test_persist_state(adb)
        
        elif action == "3":
            if not session_id:
                session_id = input("Enter session ID: ").strip()
            test_rollback_state(adb, session_id)
        
        elif action == "4":
            profile = input("Enter profile (default: test-profile-1): ").strip() or "test-profile-1"
            show_rootstore_summary(adb, profile)
        
        elif action == "5":
            print_header("Running Full Test")
            profile = input("Enter profile (default: test-profile-1): ").strip() or "test-profile-1"
            
            if test_set_environment(adb, profile):
                input("\nPress Enter after manually interacting with the app...")
                
                session_id = test_persist_state(adb)
                
                if session_id:
                    input("\nPress Enter to rollback to persisted state...")
                    test_rollback_state(adb, session_id)
                    
                    print_success("Full test completed!")
        
        elif action == "6":
            interactive_menu()
            return
        
        elif action == "7":
            print_info("Exiting...")
            break
        
        else:
            print_error("Invalid action!")


if __name__ == "__main__":
    interactive_menu()


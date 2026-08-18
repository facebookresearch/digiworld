# Android State Management System

This project provides a Python-based system for managing the state of an Android application. It offers both a command-line interface (CLI) and a RESTful API for interacting with the app, making it suitable for various use cases, including testing, automation, and integration with other systems.

## Important: Git LFS Setup Required

⚠️ This project uses Git Large File Storage (LFS) for managing large assets. Before you start:
1. Install Git LFS (see [Git LFS Setup Guide](docs/git_lfs_setup.md))
2. Run the setup script:
   ```bash
   ./setup_lfs.sh
   ```

For detailed instructions on Git LFS setup and usage, see our [Git LFS Setup Guide](docs/git_lfs_setup.md).

## Features

- **State Retrieval:** Retrieve the current state of the Android app.
- **State Setting:** Set the desired state of the Android app.
- **Deeplink Triggering:** Trigger deeplink events within the app.
- **App Readiness Check:** Check if the Android app is ready for interaction.
- **CLI Interface:** Interactive command-line interface for easy control.
- **RESTful API:** API endpoints for programmatic access and integration.
- **SQLite Database:** Stores hashes for state management.
- **Modular Design:** Encapsulates ADB interaction logic in a reusable Python library.
- **Asset Management:** Handles large assets using Git LFS for efficient version control.

## Architecture

The system employs a Python bridge architecture to communicate with the Android app. The core components are:

1.  **Python Library (`adb_actions.py`):** This module contains the core logic for interacting with the Android app using ADB commands. It handles tasks such as sending intents, capturing logcat output, and checking device readiness.

2.  **Flask API (`app.py`):** This module implements a RESTful API using the Flask framework. It exposes endpoints for state retrieval, setting, deeplink triggering, and readiness checks. It uses the Python library to perform the actual interactions with the Android app.

3.  **Command-Line Interface (CLI):** The same `app.py` file also provides a command-line interface. Users can interact with the Android app through the CLI, which uses the functions from the Python library.

4.  **Android App:** The target Android application, which interacts with the system by receiving intents and logging information to Logcat.

5.  **SQLite Database:** A local SQLite database is used to store hashes associated with the app's state.

## Getting Started

### Prerequisites

- Python 3.x
- ADB (Android Debug Bridge) installed and configured
- Android device or emulator connected and recognized by ADB
- Required Python libraries: `flask`, `requests`, `pysqlite3`, `uuid` (install with `pip install flask requests pysqlite3 uuid`)

### Installation

1.  Clone the repository:

    ```bash
    git clone [invalid URL removed] # Replace with your repo URL
    cd android-state-management
    ```

2.  (Optional) Create a virtual environment (recommended):

    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  Install the required Python packages:

    ```bash
    pip install -r requirements.txt  # Create requirements.txt if needed (see example below)
    ```

    Example `requirements.txt`:

    ```
    flask
    requests
    pysqlite3
    ```

    Extract assets and initialisation
    ```python
    yarn setup
    ```

### Running the System

#### Starting the interactive shell

```bash
ipython
```
This starts an interactive Python shell to use the module and interact with the app as required

### Ineteracting with the module

To interact with the app using the iPython, we can use the following set of commands
```python
from adb_actions import ADBActions

# Initialize the ADBActions instance
adb_actions = ADBActions(bundle_id="com.andojotransit.sbx") #one bundle ID from the above list of bundleIDS

# Set the environment with a specific data profile
adb_actions.set_environment(data_id="test-profile-1") # or any specific test-profile-i

# Persist the app state
session_id = adb_actions.persist_state()
print(f"Sadession ID: {session_id}")

# Rollback to a previous state using the session ID
adb_actions.rollback_state("1d50f08f-ca1d-47ea-894b-b8a061723aa4")
```

### Testing Append Actions

The data append system allows you to merge new JSON data with existing database records while maintaining data integrity, handling duplicates, and preserving relationships.



#### Overview

The data append process:
1. **Fetches** the current database from the device
2. **Validates** JSON data against database schema
3. **Merges** new data with existing records (avoiding duplicates)
4. **Creates** a modified database with merged data
5. **Pushes** the modified database back to the device
6. **Triggers** app refresh to use the updated database

#### Setup

1. **Place your source files** in the `source` folder at:
   ```
   data/{bundle_id}/db-forge/source/
   ```

2. **Supported file formats:**
   - `mock-*.json` - Standard mock data files
   - `test-*.json` - Test data files
   - Files are automatically mapped to database tables

3. **File naming convention:**
   - `mock-users.json` → `users` table
   - `mock-emails.json` → `emails` table
   - `test-categories.json` → `categories` table
   - Auto-detection handles both singular and plural forms

#### Usage

**Basic Usage:**
```python
from adb_actions import ADBActions

# Initialize the ADBActions instance
adb_actions = ADBActions(bundle_id="com.andojomail.sbx")

# Get database to modify - this fetches current DB and triggers append
success = adb_actions.get_db_to_modify()

if success:
    print("✅ Database modification completed successfully!")
```

The `get_db_to_modify()` method will:
- ✅ Fetch the current database from the device
- ✅ Process source files from the `source` folder
- ✅ Validate data against database schema
- ✅ Merge new data with existing records
- ✅ Generate a modified database (`modify.db`)
- ✅ Push the modified database back to the device
- ✅ Trigger app refresh to use updated database
- ✅ Preserve source JSON files for reuse

**Success Output:**
```
🚀 Starting data append for com.andojomail.sbx
🔍 Using session database for table mapping: session.db
🔍 Validating schema compatibility...
✅ All schema validations passed!
✅ Created modify.db with merged data (transaction committed)
📊 Merge Summary:
  📋 emails: 600 existing → 772 total (+172 new)
  📋 users: 15 existing → 19 total (+4 new)
🎉 Data append completed successfully!
✅ Database modification completed successfully!
```

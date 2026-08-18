<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Mockdata Generation and Loading Guide

## Overview

This guide explains how to generate, modify, and load mockdata for Andojo applications using the data generation pipeline and ADB actions. The system supports 8 applications: Email, Payment, ECommerce, Eats, Ryde, Music, Video, and Message.

## Table of Contents

1. [Data Generation Pipeline](#data-generation-pipeline)
2. [Mockdata Structure](#mockdata-structure)
3. [Generating Mockdata](#generating-mockdata)
4. [Modifying Mockdata](#modifying-mockdata)
5. [Loading Mockdata into Apps](#loading-mockdata-into-apps)
6. [Understanding Data Loading Behaviors](#understanding-data-loading-behaviors)
7. [Example Workflows](#example-workflows)

## Data Generation Pipeline

The data generation pipeline is located in `python-agent-to-app-interaction-api/data_generation_pipeline/` and uses LLM-based generation with structured output to create realistic mockdata.

### Prerequisites

1. **Python Environment**: Ensure you have a Python virtual environment active
2. **Dependencies**: Install requirements from the data_generation_pipeline folder:
   ```bash
   pip install -r requirements.txt
   ```
3. **GCP Setup**: The system uses "llama-4-maverick-17b-128e-instruct-maas" model via GCP APIs
4. **Gcloud CLI**: Required for authentication

### GCP Configuration Steps

1. Login to GCP console with your Google account
2. Create a project with desired name
3. Enable the API for "llama-4-maverick-17b-128e-instruct-maas" model
4. Configure LLM details in `invoke_llm.py` file in `data_generation_pipeline/Llm_factory` folder 
5. Install and setup Gcloud CLI
6. Authenticate using: `gcloud init`
7. Verify authentication: `gcloud auth list`

## Mockdata Structure

Each application has a specific set of mockdata files:

### Email App
- `mock-users.json` - User profiles and data
- `mock-emails.json` - Email messages and metadata

### Payment App
- `mock-users.json` - User profiles
- `mock-contacts.json` - User contacts
- `mock-wallet.json` - Wallet details
- `mock-transactions.json` - Transaction history

### ECommerce App
- `mock_users.json` - User profiles
- `mock_product_catalog.json` - Product listings
- `mock_orders.json` - Order history
- `mock_categories.json` - Product categories
- `mock_carts.json` - Shopping cart data
- `mock_promo_codes.json` - Promotional codes
- `media.zip` - Compressed media files, not generated via Data-generation pipeline


### Eats App
- `mock-categories.json` - Food categories
- `mock-drivers.json` - Delivery drivers
- `mock-feedback.json` - Order feedback
- `mock-menu-items.json` - Restaurant menu items
- `mock-order-items.json` - Order line items
- `mock-orders.json` - Order data
- `mock-restaurants.json` - Restaurant information
- `mock-user-addresses.json` - Delivery addresses
- `mock-users.json` - User profiles
- `media.zip` - Compressed media files, not generated via Data-generation pipeline


### Music App
- `albums.json` - Music albums
- `artists.json` - Artist information
- `playlists.json` - User playlists
- `songs.json` - Song catalog
- `categories.json` - Music categories
- `playback_settings.json` - Playback preferences
- `users.json` - User profiles
- `media.zip` - Compressed media files, not generated via Data-generation pipeline


### Video App
- `categories_tags.json` - Video categories and tags
- `channels.json` - Channel information
- `comments.json` - Video comments
- `playlists.json` - User playlists
- `users.json` - User profiles
- `videos.json` - Video catalog
- `assets/` - Media assets (thumbnails, videos)
- `media.zip` - Compressed media files, not generated via Data-generation pipeline

### Message App
- `app_state.json` - Application state
- `attachments.json` - Message attachments
- `call_history.json` - Call history records
- `chat_settings.json` - Chat preferences
- `group_members.json` - Group membership data
- `group_messages.json` - Group chat messages
- `groups.json` - Group information
- `messages.json` - Direct messages
- `users.json` - User profiles
- `media.zip` - Compressed media files, not generated via Data-generation pipeline


### Ryde App
- `mock-drivers.json` - Driver profiles
- `mock-feedback.json` - Ride feedback
- `mock-ride-options.json` - Vehicle options
- `mock-rides.json` - Ride history
- `mock-user-addresses.json` - User addresses
- `mock-user-payment-methods.json` - Payment methods
- `mock-users.json` - User profiles
- `routes.json` - Route information
- `media.zip` - Compressed media files, not generated via Data-generation pipeline


## Generating Mockdata

### Using the Data Generation Orchestrator

Run the orchestrator from the `python-agent-to-app-interaction-api` directory:

```bash
python data_gen_orchestrator.py [command]
```

### Generation Commands

Generate data for specific apps:
- `generate-all` - Generate data for all apps
- `generate-email` - Generate email app data
- `generate-pay` - Generate payment app data
- `generate-ecom` - Generate ecommerce app data
- `generate-music` - Generate music app data
- `generate-eats` - Generate eats app data
- `generate-ryde` - Generate ryde app data

### Copy Commands

Copy generated data to app directories:
- `copy-all` - Copy data for all apps
- `copy-email` - Copy email app data
- `copy-pay` - Copy payment app data
- `copy-ecom` - Copy ecommerce app data
- `copy-ryde` - Copy ryde app data
- `copy-eats` - Copy eats app data
- `copy-music` - Copy music app data

### Example Usage

```bash
# Generate email app data
python data_gen_orchestrator.py generate-email

# Copy email app data to app directory
python data_gen_orchestrator.py copy-email
```

### Configuration

Each app has configurable parameters in `config/constants.py`:
- Generation directory paths
- Data volume settings
- Model parameters
- Output formats

**Important**: Change the generation directory in constants every time you're generating new data to avoid overwriting existing datasets.

### Generated Data Location

- **On Generate**: Data is created in `data_generation_pipeline/app_name/artifacts`
- **On Copy**: Data is copied to `python-agent-to-app-interaction-api/data/<app-folder>/test-profile-X/mockdata`

If `test-profile-2` already exists, a new `test-profile-3` will be created automatically.

## Modifying Mockdata

You can modify mockdata in two ways:

### 1. Direct JSON Editing

Edit the JSON files directly in the mockdata directory:

```bash
# Navigate to the mockdata directory
cd python-agent-to-app-interaction-api/data/com.andojomail.sbx/test-profile-2/mockdata

# Edit the files using your preferred editor
nano mock-users.json
```

### 2. Database-Level Modifications

For more complex modifications, you can:
1. Load the data into the app
2. Use the app interface to make changes
3. Persist the state to create a new session checkpoint
4. Use that session for future testing

## Loading Mockdata into Apps

The `adb_actions.py` script provides methods to load mockdata into Android applications.

### Basic Usage

```python
from adb_actions import ADBActions

# Initialize for a specific app
adb = ADBActions("com.andojomail.sbx")

# Load mockdata and reset app
adb.load_data("test-profile-2")

# Set environment with specific session
adb.set_environment("test-profile-2", session_id="specific-session-id")
```

### Key Methods

#### `load_data(data_id, mockdata_path=None, wait_for_ready=True)`
- Performs a clean reset
- Reinitializes database and MobX from mockdata JSONs
- Ignores any UI state or session info
- Always uses provided mockdata as source of truth
- Requires login/setup again since UI state isn't restored

#### `set_environment(data_id, mockdata_path=None, wait_for_ready=False, session_id=None)`
- If `session_id` provided: Looks for session checkpoint and restores it (including UI state)
- If no `session_id` but default state exists: Restores default checkpoint
- Else: Falls back to clean reset (similar to `load_data`)

## Understanding Data Loading Behaviors

### When Mockdata is Actually Used

Mockdata is **actively used** only in these scenarios:
1. **App launch with no database file** - Fresh installation
2. **`load_data()` is called** - Explicit clean reset
3. **`set_environment()` with no session_id and no default state** - Fallback scenario

**Important**: For `set_environment()` with sessions, mockdata is copied to the device but **never used**. The app restores state exclusively from session files (`rootstore.json` and `session.db`).

### Data Loading Flow

```
set_environment(data_id, session_id) 
    ↓
Copy mockdata + assets to device (but don't use mockdata)
    ↓
Session handling:
├── session_id provided → Restore specific session (with UI state) - Uses session files only
├── No session_id but default exists → Restore default session - Uses session files only
└── No sessions available → Clean reset using mockdata (like load_data)
```

**Key Point**: Mockdata is copied in all cases but only used when no session data is available.

### Session vs Mockdata Behavior

| Method | Mockdata | UI State | Database | Use Case |
|--------|----------|----------|----------|----------|
| `load_data()` | ✅ Used | ❌ Reset | ✅ Fresh from mockdata | Clean start with new data |
| `set_environment()` with session or default |  Copied only | ✅ Restored | ✅ From session checkpoint | Continue from saved point |
| `set_environment()` without session or default | ✅ Used | ❌ Reset | ✅ Fresh from mockdata | Fallback to clean start |

**Important Note**: Mockdata is only actively used in two scenarios:
1. **First app launch** after installation (when no database file exists)
2. **`load_data()` calls** - Forces fresh initialization from mockdata

For all `set_environment()` calls, mockdata is copied to the device but **not utilized**. Only `rootstore.json` and `session.db` files are used to restore from saved checkpoints.

### Expanding Mockdata for a Profile

You can expand mockdata through:

1. **Direct JSON editing** + `load_data()` - Requires fresh login/setup
2. **Database modifications** via scripts that modify `<id>.db` files
3. **App interactions** + `persist_state()` to create new session checkpoints

**Note**: The use case "restore existing UI state + inject additional mockdata without DB modifications" is not supported by any single API.

## Example Workflows

### Creating a New Test Dataset

```bash
# 1. Generate new data
python data_gen_orchestrator.py generate-email

# 2. Copy to new test profile
python data_gen_orchestrator.py copy-email

# 3. Load and test
python -c "
from adb_actions import ADBActions
adb = ADBActions('com.andojomail.sbx')
adb.load_data('test-profile-3')
"
```

### Modifying Existing Data

```bash
# 1. Edit mockdata files
nano python-agent-to-app-interaction-api/data/com.andojomail.sbx/test-profile-2/mockdata/mock-users.json

# 2. Load modified data
python -c "
from adb_actions import ADBActions
adb = ADBActions('com.andojomail.sbx')
adb.load_data('test-profile-2')
"
```

### Creating Session Checkpoints

```python
from adb_actions import ADBActions

# Initialize and load data
adb = ADBActions('com.andojomail.sbx')
adb.load_data('test-profile-2')

# Interact with app to reach desired state
# ... (manual app interactions or automated steps)

# Create session checkpoint
session_id = adb.persist_state()
print(f"Created session: {session_id}")

# Later, restore this state
adb.set_environment('test-profile-2', session_id=session_id)
```

This guide provides a comprehensive understanding of the mockdata generation and loading system, enabling you to create, modify, and manage test data effectively for Andojo applications.
<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Append Functionality Workflow

## Overview
The append functionality allows Python scripts to incrementally update the mobile app's database by adding new data while preserving existing user data.

## Simple Flow

### What "Append" Does:
It takes the current database from the mobile app, adds new data to it, and puts it back.

### Step-by-Step Process:

**1. Python Side (`adb_actions.py`):**
```
get_db_to_modify() → dispatch_deeplink_to_android(action="append")
```

**2. Mobile App (`deeplinkHandler.ts`):**
```
append action → backupDatabase() → copies current.db to db-forge folder
```

**3. Python Side:**
```
backup_current_db_only() → fetches current.db from device
→ DatabaseValidator.execute_data_append() → adds new data
→ creates modify.db with updated data
→ push_modified_db_to_device() → sends modify.db back to device
```

**4. Mobile App:**
```
dbrefresh action → replaces main database with modify.db
→ reopens database connection → UI shows updated data
```

## In Simple Terms:
1. **Get**: Python asks mobile app "give me your current database"
2. **Modify**: Python adds new data to that database
3. **Send Back**: Python sends the updated database back to mobile app
4. **Refresh**: Mobile app replaces its database with the updated one
5. **Show**: UI displays the new data

## Why This is Useful:
- **Incremental Updates**: Only adds new data, doesn't replace everything
- **Preserves User Data**: Keeps existing emails, settings, etc.
- **Automated**: No manual intervention needed

It's like updating a spreadsheet - you get the current version, add new rows, and put it back!

## File Paths:
- **Python writes to**: `/storage/emulated/0/Android/data/com.andojomail.sbx/files/db-forge/modified/modified.db`
- **Mobile app reads from**: `/storage/emulated/0/Android/data/com.andojomail.sbx/files/db-forge/modified/modified.db`

## Database Modification & Placement Process:

### **Step-by-Step in Simplest Terms:**

**Step 1: Fetch Current Database**
- Python gets `current.db` from mobile app
- Stores it locally for modification

**Step 2: Smart Data Merging**
- `UsersAndEmailMerger` class handles the magic:
  - **Users**: Adds new users, avoids duplicates by email
  - **Emails**: Adds new emails, maintains relationships
  - **IDs**: Automatically assigns new IDs to avoid conflicts

**Step 3: Create Modified Database**
- Combines existing data + new data
- Creates `modify.db` with all the merged content
- Ensures data integrity and relationships

**Step 4: Push to Device**
- Uploads `modify.db` to device at:
  `/storage/emulated/0/Android/data/com.andojomail.sbx/files/db-forge/modified/modified.db`
- Waits for app to be ready

**Step 5: Notify Mobile App**
- Sends `dbrefresh` deeplink to mobile app
- Mobile app replaces its database with `modify.db`
- UI automatically shows updated data

### **Key Components:**
- **`get_db_to_modify()`**: Main entry point for append functionality
- **`backup_current_db_only()`**: Fetches and processes database
- **`UsersAndEmailMerger`**: Handles smart data merging
- **`push_modified_db_to_device()`**: Sends updated database back
- **`dbrefresh` deeplink**: Triggers database replacement in mobile app

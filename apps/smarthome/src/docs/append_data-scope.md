<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Feature Scope: `append_data` in `adb_actions`

## Feature Story
We want to implement an `append_data` function in `adb_actions` by expanding the existing `load_data` function.  
A new parameter will be introduced to signal that the app should **append** the provided data into the database rather than replacing existing data.  

For **Phase 1**, only `append` functionality will be implemented — modification and deletion are out of scope.  


## Goals
- Support appending mockdata to an existing device database.  
- Ensure strong data validation before insertion.  
- Maintain app/database stability while new data is appended.  
- Provide error reporting if append fails.  


## Non-Goals
- Modifying or deleting existing database entries.  
- Handling advanced data pipeline orchestration (only minimal validation + append supported).  


## Functional Requirements

### Input
- **Mockdata Source**:  
  - Optional path to custom mockdata file(s).  
  - If no path is provided, default to `mockdata/` folder.  

- **Append Flag**:  
  - A parameter in `load_data` to specify "append mode" instead of "replace mode".  


### Process
1. **Validation Layer**  
   - Check schema conformity (e.g., fields exist, types match).  
   - Reject falsy or inconsistent data (e.g., missing IDs, malformed JSON).  
   - Reject duplicate primary keys (append must not corrupt existing records).  

2. **Append Operation**  
   - Insert new records into the relevant database table(s).  
   - Support appending multiple mockdata files in a single operation.  
   - Ensure inserts do not interfere with current app session or UI state.  

3. **Error Handling**  
   - Log errors with clear messages.  
   - Fail fast on invalid data before committing to DB.  
   - Continue app stability — app should not crash or force logout.  

---

### Output
- **On Success**:  
  - New data is appended and available in the database.  
  - Device UI state remains unchanged.  

- **On Failure**:  
  - No partial inserts (rollback if possible).  
  - Error messages returned to developer logs.  
  - App/database remains stable and usable.  

## Acceptance Criteria
-  Takes mockdata from optional provided path or from the default `mockdata` folder.  
-  Appends validated data into the device database.  
-  Security checks prevent malformed, falsy, or inconsistent data from being inserted.  
-  Errors are reported clearly when append fails.  
-  Database state and device UI state are preserved (e.g., no logout triggered).  
-  Newly appended data is queryable from the database.  
-  Only append is supported in Phase 1 (no modify/delete).  

## Open Questions
1. **Concurrent Operations**  
   - What happens if the user is performing other actions (e.g., watching a video) while data is appended?  
   - Should appending wait for idle state, or can it occur concurrently?  

2. **Multiple Mockdata Files**  
   - Can there be more than one mockdata file to append in a single operation?  
   - If more than one mockdata files are shared to append_data at once, would all the data be appended again or should we detect collisions and upload only new data?
   - Assuming we share one file and one file has multiple records (few existing + some new), would we need to detect collisions and upload only unique data or can we assume if all mockdata is unique?  

3. **Data Pipeline Behavior**  
   - Does the data pipeline generate a list of all new data to append, or one/more instances of specific elements (e.g., one email, one video, one user, one restaurant, etc)?  

## Future Scope (Beyond Phase 1)
- To discuss modification and deletion of records.  

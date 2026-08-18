<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Smart Home System Data Generator Documentation

## Overview
This document describes the data generation process for the Smart Home system, including mock data for users, devices, rooms, scenes, automations, and notifications. All `.json` mock data files are generated using **Llama 3.3/4 models hosted on Google Cloud Platform (GCP)** to ensure realistic but fictional content. **No local models, closed-source LLMs, Faker.js, or images are used in this application.**

## Data Generation Technology Stack

- **Primary Models:** Llama 3.3 and Llama 4 hosted on Google Cloud Platform
- **Deployment:** Cloud-based inference using GCP's AI/ML services
- **No Local Models:** All AI processing is performed on GCP infrastructure
- **No Closed-Source LLMs:** Only open-source Llama models are used
- **No Faker.js:** All data generation is performed using AI models, not traditional faker libraries


## Data Structure

### Entity Relationships

#### Users (`users.json`)
- Basic profile information (email, username, password hash, avatar URL, bio)
- Account timestamps (created_at, updated_at, deleted_at)
- Each user can own multiple devices, rooms, scenes, and automations

#### Rooms (`rooms.json`)
- Room organization (name, description, type, floor level)
- Linked to users by `user_id`
- Each room can contain multiple devices
- Room types: living_room, bedroom, kitchen, bathroom, office, garage, etc.

#### Device Types (`device_types.json`)
- Device category definitions (lighting, temperature, security, audio)
- Device capabilities and specifications
- Brand and model information
- Icon and subcategory classifications

#### Devices (`devices.json`)
- Smart home device instances (name, type, room assignment, status)
- Device properties (JSON-based configuration for different device types)
- Status tracking (online, offline, error states)
- Battery and signal strength for wireless devices
- Firmware version and last seen timestamps

#### Scenes (`scenes.json`)
- Predefined device state combinations (name, description, icon)
- Scene activation status and user ownership
- Each scene can control multiple devices with specific target states

#### Scene Devices (`scene_devices.json`)
- Junction table linking scenes to devices
- Target device states for scene execution
- Device ordering within scenes

#### Automations (`automations.json`)
- Automated rule definitions (name, description, trigger type, trigger value)
- Automation status and user ownership
- Trigger types: time, motion, temperature, manual, geofence

#### Automation Actions (`automation_actions.json`)
- Junction table linking automations to actions
- Action types: device_control, scene_execution, notification
- Action ordering and configuration

#### Notifications (`notifications.json`)
- System alerts and user notifications
- Notification types: device_offline, security_alert, automation_triggered
- Read status and timestamps
- User-specific notification targeting

#### Device History (`device_history.json`)
- Audit trail for all device state changes
- Event types: state_change, automation_triggered, manual_control
- Old and new value tracking for complete change history
- User context and timestamps for all events

## Data Generation Process

### AI-Powered Content Generation
- **User Profiles:** Llama models generate realistic user profiles with appropriate smart home interests and expertise levels
- **Device Configurations:** AI creates diverse device setups with realistic property configurations
- **Room Organization:** Models generate logical room layouts and device placements
- **Scene Definitions:** AI creates meaningful scene combinations for common smart home scenarios
- **Automation Rules:** Models generate realistic automation triggers and actions
- **Notification Content:** AI creates appropriate system alerts and user notifications

### Data Consistency
- **Relationship Integrity:** AI models maintain proper foreign key relationships across all entities
- **Realistic Scenarios:** Generated data represents realistic smart home setups and usage patterns
- **User Context:** All data is properly associated with specific users for multi-user scenarios
- **Temporal Consistency:** Timestamps and event sequences maintain logical chronological order

### Smart Home Specific Features
- **Device Properties:** JSON-based device configurations supporting various smart home device types
- **Capability Mapping:** Device types include appropriate capabilities (brightness, temperature, motion detection, etc.)
- **Status Simulation:** Realistic device status patterns (online/offline/error states)
- **Automation Logic:** Complex automation rules with multiple trigger types and action combinations

## Technical Implementation

### Data Generation Pipeline
- **Model Selection:** Llama 3.3/4 models are selected based on content complexity requirements
- **GCP API Calls:** Data generation requests are sent to GCP-hosted Llama models
- **Content Validation:** Generated content is validated for consistency and format compliance
- **Relationship Mapping:** AI ensures proper entity relationships and foreign key constraints
- **File Generation:** Validated data is written to JSON files in the appropriate directory structure

### Pipeline Execution Flow
The generation process follows a structured workflow:

**Parallel Generation:**
- Users, rooms, and device types are generated concurrently for efficiency
- User preferences depend on user generation completion

**Validation & Repair:**
- All generated data undergoes validation for format and relationship integrity
- Automatic repair mechanisms handle common issues (duplicate names, timestamp inconsistencies)
- Cross-run memory prevents duplicate user IDs and emails across multiple generation runs

**Memory Management:**
- Persistent memory system tracks previously generated user IDs and emails
- Ensures uniqueness across multiple pipeline executions
- Memory files stored in `_memory/` directory for cross-session persistence


### Error Handling & Recovery
- **Automatic Repair:** Pipeline includes repair mechanisms for common data issues
- **Duplicate Prevention:** Memory system prevents duplicate user IDs and emails across runs
- **Timestamp Validation:** Ensures created_at timestamps are always before updated_at timestamps
- **Graceful Degradation:** Pipeline continues execution even if individual generation nodes fail

## Legal & Compliance Notes

**AI Model Usage:** All data generation uses open-source Llama models hosted on GCP
**No Closed-Source Dependencies:** No proprietary or closed-source AI models are used
**No Real Data:** No real user, device, or smart home data is used in the application
**Privacy Compliant:** All generated data is synthetic and contains no personally dentifiable information

## Data Files Structure

```
src/data/
├── users.json                 # User accounts and profiles
├── rooms.json                 # Room definitions and organization
├── device_types.json          # Device type categories and capabilities
├── devices.json               # Smart home device instances
├── scenes.json                # Scene definitions
├── scene_devices.json         # Scene-device relationships
├── automations.json           # Automation rule definitions
├── automation_actions.json    # Automation action configurations
├── notifications.json         # System notifications and alerts
└── device_history.json        # Device state change audit trail
```

## Usage in Application

### Development & Testing
- **Mock Data Loading:** JSON files are loaded into SQLite database during app initialization
- **Realistic Scenarios:** Generated data provides comprehensive testing scenarios for all app features
- **User Experience:** Diverse data ensures thorough testing of user interfaces and interactions
- **Performance Testing:** Large datasets enable performance testing of device management and automation features

### Data Refresh
- **Regeneration Process:** Data can be regenerated using updated Llama models for fresh test scenarios
- **Version Control:** Generated data files are version controlled for consistent development environments
- **Customization:** Data generation parameters can be adjusted for specific testing requirements

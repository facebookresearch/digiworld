# Smart Home App Data Model Documentation

## Overview
This document describes the database schema and data relationships for the smart home application. It explains how each table maps to app features and how entities reference each other, ensuring clarity for development and future maintenance.

---

## Entity Relationships & Table Mapping

### 1. Users
- **Table:** `users`
- **Purpose:** Stores user accounts and profile details.
- **Key Fields:**
  - `id`: Primary key
  - `email`, `username`: Unique identifiers
  - `avatar`, `bio`: Profile info
  - `created_at`, `updated_at`, `deleted_at`: Timestamps for auditing and soft deletion
- **References:**
  - One-to-one with `user_preferences` (via `user_preferences.user_id`)
  - One-to-many with `devices` (via `devices.user_id` - if added)

### 2. Rooms
- **Table:** `rooms`
- **Purpose:** Represents physical rooms in the home
- **Key Fields:**
  - `id`: Primary key
  - `name`, `description`: Room details
  - `type`: living_room, bedroom, kitchen, bathroom, office, garage, other
  - `floor`: Floor number
  - `created_at`, `updated_at`, `deleted_at`
- **References:**
  - One-to-many with `devices` (via `devices.room_id`)

### 3. Device Types
- **Table:** `device_types`
- **Purpose:** Master catalog of device types and their capabilities
- **Key Fields:**
  - `id`: Primary key
  - `name`: Unique device type name
  - `category`: lighting, temperature, security, audio
  - `subcategory`: smart_bulbs, smart_switches, smart_plugs, led_strips, smart_ac, smart_fans, smart_heaters, security_cameras, door_sensors, smart_audio
  - `capabilities`: JSON string of device capabilities
  - `icon`, `brand`, `model`: Device metadata
  - `is_active`: Whether this device type is available
- **References:**
  - One-to-many with `devices` (via `devices.device_type_id`)

### 4. Devices
- **Table:** `devices`
- **Purpose:** Individual smart devices in the home
- **Key Fields:**
  - `id`: Primary key
  - `name`: Device name
  - `device_type_id`: References `device_types.id`
  - `room_id`: References `rooms.id` (optional)
  - `status`: online, offline, error
  - `is_on`: Boolean for on/off state
  - `properties`: JSON string of device-specific properties
  - `battery`, `signal_strength`: Device health metrics
  - `firmware_version`, `last_seen`: Device info
  - `created_at`, `updated_at`, `deleted_at`
- **References:**
  - Many-to-one with `device_types`, `rooms`
  - One-to-many with `scene_devices`, `automation_actions`, `notifications`, `device_history`

### 5. Scenes
- **Table:** `scenes`
- **Purpose:** Predefined device states for different scenarios
- **Key Fields:**
  - `id`: Primary key
  - `name`, `description`: Scene details
  - `icon`: Scene icon
  - `is_active`: Whether scene is available
  - `created_at`, `updated_at`, `deleted_at`
- **References:**
  - One-to-many with `scene_devices` (via `scene_devices.scene_id`)
  - One-to-many with `automation_actions` (via `automation_actions.scene_id`)

### 6. Scene Devices
- **Table:** `scene_devices`
- **Purpose:** Maps devices to scenes with target states
- **Key Fields:**
  - `scene_id`: References `scenes.id`
  - `device_id`: References `devices.id`
  - `target_state`: JSON string of target device state
  - `order`: Order within scene
  - `UNIQUE(scene_id, device_id)` ensures no duplicate device in scene

### 7. Automations
- **Table:** `automations`
- **Purpose:** Automated actions triggered by conditions
- **Key Fields:**
  - `id`: Primary key
  - `name`, `description`: Automation details
  - `trigger_type`: time,geofence
  - `trigger_value`: JSON string of trigger conditions
  - `is_active`: Whether automation is enabled
  - `created_at`, `updated_at`, `deleted_at`
- **References:**
  - One-to-many with `automation_actions` (via `automation_actions.automation_id`)

### 8. Automation Actions
- **Table:** `automation_actions`
- **Purpose:** Actions performed when automations trigger
- **Key Fields:**
  - `automation_id`: References `automations.id`
  - `action_type`: device_control, scene_execution, notification
  - `device_id`: References `devices.id` (for device actions)
  - `scene_id`: References `scenes.id` (for scene actions)
  - `action_value`: JSON string of action parameters
  - `order`: Order of execution
  - `UNIQUE(automation_id, order)` ensures ordered execution

### 9. Notifications
- **Table:** `notifications`
- **Purpose:** System and device notifications
- **Key Fields:**
  - `id`: Primary key
  - `title`, `message`: Notification content
  - `type`: system, security, device, custom
  - `device_id`: References `devices.id` (optional)
  - `is_read`: Whether notification has been read
  - `priority`: low, medium, high, critical
  - `created_at`, `deleted_at`

### 10. Device History
- **Table:** `device_history`
- **Purpose:** Audit trail of device state changes
- **Key Fields:**
  - `device_id`: References `devices.id`
  - `event_type`: state_change, status_change, error, usage, security
  - `old_value`, `new_value`: JSON strings of state values
  - `timestamp`: When the event occurred

### 11. User Preferences
- **Table:** `user_preferences`
- **Purpose:** User-specific settings and preferences
- **Key Fields:**
  - `user_id`: References `users.id` (unique)
  - `theme`: light, dark, auto
  - `language`: en, es, hi
  - `notifications_enabled`: Boolean
  - `geofencing_enabled`: Boolean
  - `home_location`: JSON string of lat/lng
  - `geofence_radius`: Radius in meters
  - `created_at`, `updated_at`

---

## Data Integrity & Reference Notes
- All major relationships use foreign keys for referential integrity.
- Many-to-many relationships (scenes-devices) use mapping tables with unique constraints.
- Soft deletion (`deleted_at`) is used for users, rooms, devices, scenes, and automations to allow for recovery and audit.
- Device-specific properties are stored as JSON strings for flexibility.
- All timestamps use UTC via `strftime` for consistency.
- Device history provides comprehensive audit trail for debugging and analytics.

---

## Example Data Mapping Scenarios

- **A user adds a smart light:**
  - Insert into `devices` with `device_type_id` referencing a lighting device type.
  - Set `room_id` to assign it to a specific room.

- **A user creates a "Movie Night" scene:**
  - Insert into `scenes` with scene details.
  - Add devices via `scene_devices` with target states (dim lights, close blinds, etc.).

- **A user sets up a morning automation:**
  - Insert into `automations` with time trigger.
  - Add actions via `automation_actions` (turn on lights, adjust thermostat, etc.).

- **A device status changes:**
  - Update `devices.status` and `devices.last_seen`.
  - Insert into `device_history` with old and new values.

- **A user receives a notification:**
  - Insert into `notifications` with device reference and priority.

- **A user updates preferences:**
  - Update `user_preferences` with new theme, language, or notification settings.

---

## Extensibility & Future Considerations
- Additional device types can be added to `device_types` table.
- New automation triggers and actions can be supported via JSON flexibility.
- Analytics tables can be added for usage patterns and energy consumption.
- Integration with external services can be added via additional tables.
- Multi-home support can be added with a `homes` table.

---

## Asset Management
- Device icons and scene icons are referenced via URLs or icon names.
- Device firmware updates can be managed through the `firmware_version` field.

---

## Summary
This schema is designed for extensibility, robust referential integrity, and clarity. All major smart home features are mapped, and the relationships are documented for both backend and frontend development. The schema supports complex automation scenarios while maintaining data consistency and providing comprehensive audit trails.

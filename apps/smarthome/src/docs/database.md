# Smart Home Database Schema Documentation

This document describes the **smart home database schema** implemented with **Drizzle ORM (SQLite)**. It provides details about each table, its columns, relationships, and potential use cases.

---

## 1. **Users Table** (`users`)
Stores information about registered users.

| Column      | Type    | Description |
|-------------|---------|-------------|
| id          | INTEGER (PK, AI) | Unique user ID. |
| email       | TEXT (Unique, Not Null) | User email address. |
| username    | TEXT (Unique, Not Null) | User’s username. |
| password    | TEXT (Not Null) | Hashed password. |
| avatar      | TEXT | Profile picture URL. |
| bio         | TEXT | Short bio or description. |
| created_at  | TEXT | Timestamp of creation. |
| updated_at  | TEXT | Timestamp of last update. |
| deleted_at  | TEXT | Timestamp when deleted (soft delete). |

**Use Case:** User authentication, profiles, personalization.

---

## 2. **Rooms Table** (`rooms`)
Represents rooms in the smart home.

| Column      | Type    | Description |
|-------------|---------|-------------|
| id          | INTEGER (PK, AI) | Unique room ID. |
| name        | TEXT (Not Null) | Room name (e.g., "Living Room"). |
| description | TEXT | Optional description. |
| type        | TEXT (Default: `other`) | Room type (living_room, bedroom, kitchen, etc.). |
| floor       | INTEGER (Default: 1) | Floor number. |
| created_at  | TEXT | Timestamp of creation. |
| updated_at  | TEXT | Timestamp of last update. |
| deleted_at  | TEXT | Timestamp when deleted (soft delete). |

**Use Case:** Categorizing devices by location.

---

## 3. **Device Types Table** (`device_types`)
Defines types of devices supported.

| Column        | Type    | Description |
|---------------|---------|-------------|
| id            | INTEGER (PK, AI) | Unique device type ID. |
| name          | TEXT (Unique, Not Null) | Device type name. |
| category      | TEXT (Not Null) | Device category (lighting, temperature, etc.). |
| subcategory   | TEXT | Subcategory (e.g., smart_bulbs, smart_fans). |
| capabilities  | TEXT | JSON string of device capabilities. |
| icon          | TEXT | Icon path or identifier. |
| brand         | TEXT (Default: `Andojo`) | Brand of device. |
| model         | TEXT | Model identifier. |
| is_active     | BOOLEAN (Default: true) | Whether the type is available. |
| created_at    | TEXT | Timestamp of creation. |
| updated_at    | TEXT | Timestamp of last update. |

**Use Case:** Template for creating devices.

---

## 4. **Devices Table** (`devices`)
Represents actual devices installed in rooms.

| Column         | Type    | Description |
|----------------|---------|-------------|
| id             | INTEGER (PK, AI) | Unique device ID. |
| name           | TEXT (Not Null) | Device name. |
| device_type_id | INTEGER (FK → device_types.id) | Type of device. |
| room_id        | INTEGER (FK → rooms.id) | Associated room. |
| status         | TEXT (Default: `online`) | Current status (online, offline, error). |
| is_on          | BOOLEAN (Default: false) | On/off state. |
| properties     | TEXT | JSON properties (brightness, temperature, etc.). |
| battery        | INTEGER (Default: 100) | Battery percentage. |
| signal_strength| INTEGER (Default: 100) | WiFi/Zigbee signal strength. |
| firmware_version | TEXT | Firmware version. |
| last_seen      | TEXT | Last activity timestamp. |
| created_at     | TEXT | Timestamp of creation. |
| updated_at     | TEXT | Timestamp of last update. |
| deleted_at     | TEXT | Soft delete timestamp. |

**Use Case:** Managing physical devices.

---

## 5. **Scenes Table** (`scenes`)
Groups multiple device actions into a scene.

| Column      | Type    | Description |
|-------------|---------|-------------|
| id          | INTEGER (PK, AI) | Unique scene ID. |
| name        | TEXT (Not Null) | Scene name (e.g., “Good Morning”). |
| description | TEXT | Scene description. |
| icon        | TEXT | Icon for scene. |
| is_active   | BOOLEAN (Default: true) | Active status. |
| created_at  | TEXT | Timestamp of creation. |
| updated_at  | TEXT | Timestamp of last update. |
| deleted_at  | TEXT | Timestamp when deleted. |

**Use Case:** Triggering multiple devices together.

---

## 6. **Scene Devices Table** (`scene_devices`)
Maps devices to scenes.

| Column       | Type    | Description |
|--------------|---------|-------------|
| id           | INTEGER (PK, AI) | Unique mapping ID. |
| scene_id     | INTEGER (FK → scenes.id) | Scene reference. |
| device_id    | INTEGER (FK → devices.id) | Device reference. |
| target_state | TEXT (Not Null) | JSON describing target state. |
| order        | INTEGER (Default: 0) | Execution order. |

**Use Case:** Define device states when a scene runs.

---

## 7. **Automations Table** (`automations`)
Defines automation rules.

| Column        | Type    | Description |
|---------------|---------|-------------|
| id            | INTEGER (PK, AI) | Automation ID. |
| name          | TEXT (Not Null) | Automation name. |
| description   | TEXT | Optional description. |
| trigger_type  | TEXT (Not Null) | Trigger type (time, motion, etc.). |
| trigger_value | TEXT | JSON describing trigger conditions. |
| is_active     | BOOLEAN (Default: true) | Active status. |
| created_at    | TEXT | Timestamp of creation. |
| updated_at    | TEXT | Timestamp of last update. |
| deleted_at    | TEXT | Soft delete timestamp. |

**Use Case:** Rules for automating devices/scenes.

---

## 8. **Automation Actions Table** (`automation_actions`)
Defines actions linked to automations.

| Column       | Type    | Description |
|--------------|---------|-------------|
| id           | INTEGER (PK, AI) | Unique action ID. |
| automation_id| INTEGER (FK → automations.id) | Related automation. |
| action_type  | TEXT (Not Null) | Action type (device_control, scene_execution, notification). |
| device_id    | INTEGER (FK → devices.id) | Target device. |
| scene_id     | INTEGER (FK → scenes.id) | Target scene. |
| action_value | TEXT | JSON describing action (e.g., set brightness). |
| order        | INTEGER (Default: 0) | Execution order. |

**Use Case:** Specifies what happens when automation triggers.

---

## 9. **Notifications Table** (`notifications`)
Stores system and device notifications.

| Column      | Type    | Description |
|-------------|---------|-------------|
| id          | INTEGER (PK, AI) | Notification ID. |
| title       | TEXT (Not Null) | Notification title. |
| message     | TEXT (Not Null) | Notification message. |
| type        | TEXT (Not Null) | Type (system, security, device, custom). |
| device_id   | INTEGER (FK → devices.id) | Linked device (if any). |
| is_read     | BOOLEAN (Default: false) | Read status. |
| priority    | TEXT (Default: `medium`) | Priority (low, medium, high, critical). |
| created_at  | TEXT | Timestamp of creation. |
| deleted_at  | TEXT | Soft delete timestamp. |

**Use Case:** Alerts for user and system events.

---

## 10. **Device History Table** (`device_history`)
Tracks device activity and state changes.

| Column     | Type    | Description |
|------------|---------|-------------|
| id         | INTEGER (PK, AI) | History record ID. |
| device_id  | INTEGER (FK → devices.id) | Related device. |
| event_type | TEXT (Not Null) | Event type (state_change, error, usage). |
| old_value  | TEXT | Previous state (JSON). |
| new_value  | TEXT | New state (JSON). |
| timestamp  | TEXT | Event timestamp. |

**Use Case:** Device analytics, troubleshooting, auditing.

---

## 11. **User Preferences Table** (`user_preferences`)
Stores user-specific preferences.

| Column              | Type    | Description |
|---------------------|---------|-------------|
| id                  | INTEGER (PK, AI) | Preference ID. |
| user_id             | INTEGER (FK → users.id, Unique) | Linked user. |
| theme               | TEXT (Default: `auto`) | App theme (light, dark, auto). |
| language            | TEXT (Default: `en`) | Preferred language. |
| notifications_enabled | BOOLEAN (Default: true) | Notifications toggle. |
| geofencing_enabled  | BOOLEAN (Default: false) | Geofencing toggle. |
| home_location       | TEXT | JSON lat/lng. |
| geofence_radius     | INTEGER (Default: 100) | Radius in meters. |
| created_at          | TEXT | Timestamp of creation. |
| updated_at          | TEXT | Timestamp of last update. |

**Use Case:** Personalization of app experience.

---

# Relationships Overview
- **users ↔ user_preferences** (1:1)
- **rooms ↔ devices** (1:M)
- **device_types ↔ devices** (1:M)
- **scenes ↔ scene_devices ↔ devices** (M:N)
- **automations ↔ automation_actions ↔ (devices/scenes)** (1:M)
- **devices ↔ device_history** (1:M)
- **devices ↔ notifications** (1:M)

---

# Example Use Cases
1. A user configures their **bedroom lights** (device) to turn on automatically at 7:00 AM (automation).
2. A **scene** called “Movie Night” dims lights, closes blinds, and turns on the TV.
3. Device health tracked in **device_history** to monitor failures.
4. **Notifications** alert users if security devices detect unusual activity.

---

This schema supports a **scalable smart home system** with **user customization, automation, and device management**.

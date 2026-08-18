# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for smarthome scenario instance generation.

Purely programmatic -- no LLM needed. All data is structural.
"""

import json
from typing import Any, Dict, List

from digiworld.scenarios.builders import write_mockdata
from digiworld.scenarios.constraints import EntityExistsConstraint

# ---------------------------------------------------------------------------
# Legacy category-level mapping (kept for backward compatibility with
# turn_on_device instances that were already generated with these IDs).
# ---------------------------------------------------------------------------

DEVICE_NAMES = {
    "lighting": [
        "Living Room Light", "Bedroom Light", "Kitchen Light",
        "Bathroom Light", "Office Light", "Dining Room Light",
        "Hallway Light", "Garage Light", "Front Porch Light",
        "Back Porch Light",
    ],
    "temperature": [
        "Living Room AC", "Bedroom AC", "Office AC",
        "Living Room Fan", "Bedroom Fan", "Kitchen Fan",
    ],
    "security": [
        "Front Door Camera", "Back Door Camera", "Garage Camera",
        "Living Room Camera", "Driveway Camera",
    ],
    "audio": [
        "Living Room Speaker", "Bedroom Speaker", "Kitchen Speaker",
        "Office Speaker", "Bathroom Speaker",
    ],
}

DEVICE_TYPE_ID_MAP = {
    "lighting": 1,
    "temperature": 5,
    "security": 4,
    "audio": 7,
}

DEVICE_PROPERTIES = {
    "lighting": '{"brightness": 75, "color_temperature": 3000, "color": "#ffffff", "color_mode": "white"}',
    "temperature": '{"temperature": 72, "target_temperature": 72, "fan_speed": 3, "mode": "auto"}',
    "security": '{"motion_detection": true, "night_vision": true, "recording_enabled": true}',
    "audio": '{"volume": 50, "is_playing": false}',
}


def device_record(
    name: str, device_category: str, **overrides: Any
) -> Dict[str, Any]:
    record = {
        "userId": "{{current_user_id}}",
        "name": name,
        "deviceTypeId": DEVICE_TYPE_ID_MAP[device_category],
        "roomId": "{{first_room_id}}",
        "status": "offline",
        "isOn": False,
        "properties": DEVICE_PROPERTIES[device_category],
        "battery": 100,
        "signalStrength": 95,
        "firmwareVersion": "1.0.0",
        "lastSeen": "{{recent_timestamp}}",
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record


# ---------------------------------------------------------------------------
# Specific device-type names.
# IDs are resolved dynamically from the active profile/device_types table,
# because profile JSON may assign different numeric IDs over time.
# ---------------------------------------------------------------------------

ALL_DEVICE_TYPES: List[str] = [
    "Smart Bulb",
    "Smart Switch",
    "Smart Plug",
    "Security Camera",
    "Smart AC",
    "Smart Fan",
    "Smart Speaker",
    "LED Strips",
    "Smart Heater",
]

DEVICE_CATEGORY_BY_TYPE: Dict[str, str] = {
    "Smart Bulb": "lighting",
    "Smart Switch": "lighting",
    "Smart Plug": "lighting",
    "LED Strips": "lighting",
    "Smart AC": "temperature",
    "Smart Fan": "temperature",
    "Smart Heater": "temperature",
    "Smart Speaker": "audio",
    "Security Camera": "security",
}

DEFAULT_DEVICE_PROPERTIES: Dict[str, dict] = {
    "Smart Bulb": {
        "brightness": 50, "color_temperature": 3000,
        "color": "#ffffff", "color_mode": "white", "scheduling": False,
    },
    "Smart Switch": {"scheduling": False, "energy_monitoring": False},
    "Smart Plug": {"scheduling": False, "energy_monitoring": False},
    "LED Strips": {
        "brightness": 50, "color": "#ffffff", "color_mode": "white",
        "effects": False, "music_sync": False,
    },
    "Smart AC": {
        "temperature": 72, "target_temperature": 72, "humidity": 50,
        "fan_speed": 1, "mode": "auto", "scheduling": False,
    },
    "Smart Fan": {"fan_speed": 1, "oscillation": False, "scheduling": False},
    "Smart Heater": {
        "temperature": 72, "target_temperature": 72, "humidity": 50,
        "fan_speed": 1, "mode": "auto", "scheduling": False,
    },
    "Smart Speaker": {
        "volume": 50, "is_playing": False, "volume_control": False,
        "music_playback": False, "voice_assistant": False, "bluetooth": False,
    },
    "Security Camera": {
        "motion_detection": False, "night_vision": False,
        "two_way_audio": False, "recording_enabled": False, "cloud_storage": False,
    },
}

DEVICE_NAMES_BY_TYPE: Dict[str, List[str]] = {
    "Smart Bulb": [
        "Living Room Bulb", "Bedroom Bulb", "Kitchen Bulb",
        "Bathroom Bulb", "Office Bulb",
    ],
    "Smart Switch": [
        "Living Room Switch", "Bedroom Switch", "Kitchen Switch",
        "Garage Switch", "Patio Switch",
    ],
    "Smart Plug": [
        "Living Room Plug", "Bedroom Plug", "Kitchen Plug",
        "Office Plug", "Garage Plug",
    ],
    "LED Strips": [
        "Living Room LED Strip", "Bedroom LED Strip", "Gaming Room LED Strip",
        "Kitchen LED Strip", "Patio LED Strip",
    ],
    "Smart AC": [
        "Living Room AC Unit", "Bedroom AC Unit", "Office AC Unit",
        "Guest Room AC Unit", "Dining Room AC Unit",
    ],
    "Smart Fan": [
        "Living Room Fan", "Bedroom Fan", "Kitchen Fan",
        "Office Fan", "Garage Fan",
    ],
    "Smart Heater": [
        "Living Room Heater", "Bedroom Heater", "Office Heater",
        "Bathroom Heater", "Guest Room Heater",
    ],
    "Smart Speaker": [
        "Living Room Speaker", "Bedroom Speaker", "Kitchen Speaker",
        "Office Speaker", "Bathroom Speaker",
    ],
    "Security Camera": [
        "Entrance Monitor Cam", "Perimeter Watch Cam", "Lobby View Cam",
        "Corridor Scout Cam", "Rooftop Cam",
    ],
}

ROOM_NAMES: List[str] = [
    "Study Room", "Media Room", "Playroom",
    "Nursery", "Workshop", "Sunroom",
]

ROOM_TYPES: List[str] = [
    "living_room", "bedroom", "kitchen", "bathroom", "office",
    "garage", "dining_room", "guest_room", "laundry_room",
    "basement", "attic", "balcony", "patio", "garden", "other",
]

AUTOMATION_TRIGGER_TYPES: List[str] = ["time", "geofence"]

SCENE_ICONS: List[str] = [
    "home", "bed", "sunny", "moon",
    "tv", "musical-notes", "leaf", "flame",
]


def typed_device_record(
    name: str, device_type: str, **overrides: Any
) -> Dict[str, Any]:
    """Build a device mockdata record for a specific device type name."""
    record = {
        "userId": "{{current_user_id}}",
        "name": name,
        "deviceTypeId": f"{{{{device_type_id_by_name:{device_type}}}}}",
        "roomId": "{{first_room_id}}",
        "status": "online",
        "isOn": False,
        "properties": json.dumps(DEFAULT_DEVICE_PROPERTIES[device_type]),
        "battery": 100,
        "signalStrength": 95,
        "firmwareVersion": "1.0.0",
        "lastSeen": "{{recent_timestamp}}",
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record


def room_record(
    name: str,
    description: str = "",
    room_type: str = "other",
    floor: int = 1,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a room mockdata record."""
    record = {
        "userId": "{{current_user_id}}",
        "name": name,
        "description": description,
        "type": room_type,
        "floor": floor,
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record


# ---------------------------------------------------------------------------
# Reusable feasibility constraints
# ---------------------------------------------------------------------------

ROOMS_EXIST = EntityExistsConstraint(table="rooms", user_filter=True, min_count=1)
DEVICES_EXIST = EntityExistsConstraint(table="devices", user_filter=True, min_count=1)
SCENES_EXIST = EntityExistsConstraint(table="scenes", user_filter=True, min_count=1)
AUTOMATIONS_EXIST = EntityExistsConstraint(table="automations", user_filter=True, min_count=1)

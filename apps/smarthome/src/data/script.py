# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import random
from datetime import datetime
from pathlib import Path

# Templates (some need a device, some are global/system)
TEMPLATES = [
    {
        "title": "Motion Detected",
        "message": "Motion detected at {}",
        "type": "security",
        "device_required": True,
        "priority": "medium"
    },
    {
        "title": "Device Offline",
        "message": "{} is offline",
        "type": "system",
        "device_required": True,
        "priority": "low"
    },
    {
        "title": "Temperature Alert",
        "message": "{} temperature set to {}°F",
        "type": "device",
        "device_required": True,
        "priority": "medium"
    },
    {
        "title": "Low Battery",
        "message": "{} battery is low ({}%)",
        "type": "system",
        "device_required": True,
        "priority": "high"
    },
    {
        "title": "Scene Activated",
        "message": "Movie Night scene activated",
        "type": "system",
        "device_required": False,
        "priority": "low"
    },
    {
        "title": "Automation Triggered",
        "message": "Morning Routine automation executed",
        "type": "system",
        "device_required": False,
        "priority": "low"
    },
    {
        "title": "System Update",
        "message": "System firmware updated to version 2.1.0",
        "type": "system",
        "device_required": False,
        "priority": "medium"
    }
]

def load_json(filename):
    with open(filename, "r") as f:
        return json.load(f)

def generate_notifications_for_user(user, devices, notif_id_start=1, count=5):
    """Generate notifications only for devices that belong to this user"""
    notifications = []
    notif_id = notif_id_start

    user_devices = [d for d in devices if d["user_id"] == user["id"]]

    for _ in range(count):
        template = random.choice(TEMPLATES)

        device_id = None
        message = template["message"]

        if template["device_required"] and user_devices:
            device = random.choice(user_devices)
            device_id = device["id"]

            # Format dynamic messages
            if "{}" in message:
                if "temperature" in message:
                    temp = random.choice([68, 70, 72, 75])
                    message = message.format(device["name"], temp)
                elif "battery" in message:
                    battery = random.randint(5, 30)
                    message = message.format(device["name"], battery)
                else:
                    message = message.format(device["name"])

        notif = {
            "id": notif_id,
            "title": template["title"],
            "message": message,
            "type": template["type"],
            "device_id": device_id,
            "is_read": random.choice([0, 1]),
            "priority": template["priority"],
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "deleted_at": None,
            "read_at": None if random.choice([True, False]) else datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "user_id": user["id"]
        }

        notifications.append(notif)
        notif_id += 1

    return notifications, notif_id

def main():
    users = load_json("users.json")
    devices = load_json("devices.json")

    all_notifications = []
    notif_id = 1  # 🔑 global counter

    for user in users:
        user_notifications, notif_id = generate_notifications_for_user(
            user, devices, notif_id_start=notif_id, count=10
        )
        all_notifications.extend(user_notifications)

    # Save notifications.json
    with open("notifications.json", "w") as f:
        json.dump(all_notifications, f, indent=2)

    print(f"✅ Generated {len(all_notifications)} notifications into notifications.json")

if __name__ == "__main__":
    main()

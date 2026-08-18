# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Parking Sandbox Data Generator
Generates realistic mock data for parking simulation with configurable parameters
Saves output JSON files with camelCase keys in an output directory.

Updated: parking zones and user locations constrained to a provided bounding box.
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Tuple
from faker import Faker

# Initialize Faker
fake = Faker()
Faker.seed(42)
random.seed(42)


def snake_to_camel(snake_str: str) -> str:
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def convert_keys_to_camel(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively convert dictionary keys from snake_case to camelCase"""
    if isinstance(data, dict):
        new = {}
        for k, v in data.items():
            nk = snake_to_camel(k)
            if isinstance(v, dict):
                new[nk] = convert_keys_to_camel(v)
            elif isinstance(v, list):
                # convert list elements if dicts
                new[nk] = [convert_keys_to_camel(x) if isinstance(x, dict) else x for x in v]
            else:
                new[nk] = v
        return new
    return data


# Default configuration
CONFIG = {
    "num_users": 25,
    "locations_per_user": 2,
    "vehicle_types": ["car", "motorcycle", "van", "truck", "ev"],
    "vehicles_per_user": 1,
    "payment_methods_percent": 0.7,  # probability a user has at least one payment method
    "zones_count": 50,
    "history_per_user": 5,
    "output_dir": "mock_parking_data",
    "start_date": (datetime.now() - timedelta(days=90)).date().isoformat(),
    "end_date": (datetime.now() + timedelta(days=30)).date().isoformat(),
    # Bounding box for all generated lat/lon: (min_lon, min_lat, max_lon, max_lat)
    # Default is Manhattan-ish; you provided:
    # bbox = (-74.00674, 40.71278, -73.97524, 40.75929)
    "bbox": (-74.00674, 40.71278, -73.97524, 40.75929),
}


class ParkingDataGenerator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.output_dir = Path(config["output_dir"])
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # containers
        self.data = {
            "users": [],
            "user_locations": [],
            "vehicle_types": [],
            "vehicles": [],
            "payment_methods": [],
            "parking_zones": [],
            "vehicle_type_rates": [],
            "parking_history": [],
            "notifications": [],
        }

        # counters (id generators)
        self.counters = {k: 1 for k in self.data.keys()}

        # unpack bbox for convenience
        self.bbox = self._validate_bbox(config.get("bbox"))
        
        # Load static locations from locations.json
        self.static_locations = self._load_static_locations()
        self.location_index = 0  # Track current position in static locations
        
        # Load static zones from zones.json
        self.static_zones = self._load_static_zones()

    def _load_static_locations(self) -> list:
        """Load static locations from locations.json file."""
        # Try to find locations.json relative to this script
        script_dir = Path(__file__).parent
        locations_file = script_dir / "static" / "locations.json"
        
        if not locations_file.exists():
            # Fallback: try relative to parking app data directory
            locations_file = script_dir.parent / "data" / "static" / "locations.json"
        
        if not locations_file.exists():
            print(f"⚠️  Warning: locations.json not found at {locations_file}")
            print("   Falling back to random bbox generation for user locations")
            return []
        
        try:
            with open(locations_file, "r", encoding="utf-8") as f:
                locations = json.load(f)
            print(f"✅ Loaded {len(locations)} static locations from {locations_file}")
            return locations
        except Exception as e:
            print(f"⚠️  Warning: Failed to load locations.json: {e}")
            print("   Falling back to random bbox generation for user locations")
            return []
    
    def _load_static_zones(self) -> list:
        """Load static zones from zones.json file."""
        # Try to find zones.json relative to this script
        script_dir = Path(__file__).parent
        zones_file = script_dir / "static" / "zones.json"
        
        if not zones_file.exists():
            # Fallback: try relative to parking app data directory
            zones_file = script_dir.parent / "data" / "static" / "zones.json"
        
        if not zones_file.exists():
            print(f"⚠️  Warning: zones.json not found at {zones_file}")
            print("   Falling back to random bbox generation for parking zones")
            return []
        
        try:
            with open(zones_file, "r", encoding="utf-8") as f:
                zones = json.load(f)
            print(f"✅ Loaded {len(zones)} static zones from {zones_file}")
            return zones
        except Exception as e:
            print(f"⚠️  Warning: Failed to load zones.json: {e}")
            print("   Falling back to random bbox generation for parking zones")
            return []

    def _validate_bbox(self, bbox: Tuple[float, float, float, float]) -> Tuple[float, float, float, float]:
        """Validate and normalize bbox to (min_lon, min_lat, max_lon, max_lat)."""
        if not bbox or len(bbox) != 4:
            raise ValueError("bbox must be a 4-tuple: (min_lon, min_lat, max_lon, max_lat)")
        min_lon, min_lat, max_lon, max_lat = bbox
        if min_lon > max_lon or min_lat > max_lat:
            raise ValueError("bbox coordinates invalid: ensure min <= max for lon and lat")
        return (min_lon, min_lat, max_lon, max_lat)

    def _random_point_in_bbox(self) -> (float, float):
        """Return (lat, lon) random point inside bbox."""
        min_lon, min_lat, max_lon, max_lat = self.bbox
        lon = random.uniform(min_lon, max_lon)
        lat = random.uniform(min_lat, max_lat)
        return (round(lat, 6), round(lon, 6))
    
    def _get_next_static_location(self) -> Dict[str, Any]:
        """Get next location from static locations, cycling through all before repeating."""
        if not self.static_locations:
            # Fallback to random if no static locations loaded
            lat, lon = self._random_point_in_bbox()
            return {
                "lat": lat,
                "lon": lon,
                "name": fake.address().replace("\n", ", ")
            }
        
        # Get location at current index
        location = self.static_locations[self.location_index]
        
        # Move to next location, cycling back to 0 after all are used
        self.location_index = (self.location_index + 1) % len(self.static_locations)
        
        return location

    def get_id(self, table: str) -> int:
        cur = self.counters[table]
        self.counters[table] += 1
        return cur

    def generate_all(self):
        print("🚗 Starting Parking Data Generation...")
        self.generate_vehicle_types()
        self.generate_parking_zones()
        self.generate_vehicle_type_rates()
        self.generate_users()
        self.generate_user_locations()
        self.generate_vehicles()
        self.generate_payment_methods()
        self.generate_parking_history()
        self.generate_notifications()
        self.save_all()
        print("✅ Parking data generation complete!")

    # ----------------
    # Generators
    # ----------------

    def generate_vehicle_types(self):
        print("🏷️  Generating vehicle types...")
        # Use basic readable names and descriptions; codes must be unique (matching your schema comment)
        type_map = {
            "car": "Car",
            "motorcycle": "Motorcycle",
            "van": "Van",
            "truck": "Truck",
            "ev": "Electric Vehicle",
        }
        for code in self.config["vehicle_types"]:
            self.data["vehicle_types"].append({
                "id": self.get_id("vehicle_types"),
                "code": code,
                "name": type_map.get(code, code.title()),
                "description": f"{type_map.get(code, code.title())} vehicle type",
                "metadata": None,
                "created_at": datetime.now().isoformat(),
            })

    def _generate_zone_code(self) -> str:
        """Generate a unique 6-digit alphanumeric zone code (e.g., A1B2C3)."""
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        existing_codes = {z["zone_code"] for z in self.data["parking_zones"]}
        
        while True:
            code = ''.join(random.choice(chars) for _ in range(6))
            if code not in existing_codes:
                return code
    
    def generate_parking_zones(self):
        print("📍 Generating parking zones from static zones.json...")
        
        # Determine how many zones to generate
        if self.static_zones:
            # Use ALL zones from static file (ignore config zones_count)
            num_zones = len(self.static_zones)
            print(f"   Using all {num_zones} zones from zones.json")
            
            # Use all zones from static file
            for idx in range(num_zones):
                static_zone = self.static_zones[idx]
                zone_name = static_zone.get("name", f"Zone {idx + 1}")
                lat = static_zone.get("latitude")
                lon = static_zone.get("longitude")
                
                zone = {
                    "id": self.get_id("parking_zones"),
                    "name": zone_name,
                    "description": fake.sentence(nb_words=6),
                    "latitude": lat,
                    "longitude": lon,
                    "zone_code": self._generate_zone_code(),
                    "operator": random.choice(["City Parking", "Downtown Ops", "Private Lot Co."]),
                    "zone_type": random.choice(["curbside", "lot", "garage"]),
                    "capacity": random.randint(20, 300),
                    "rate_currency": "USD",
                    "rate_multiplier": round(random.uniform(0.8, 1.6), 2),
                    "is_active": 1,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "metadata": None,
                }
                self.data["parking_zones"].append(zone)
        else:
            # Fallback to random generation if no static zones loaded
            print("   Using random bbox generation (no static zones available)")
            for i in range(self.config["zones_count"]):
                lat, lon = self._random_point_in_bbox()
                zone = {
                    "id": self.get_id("parking_zones"),
                    "name": f"Zone {i + 1}",
                    "description": fake.sentence(nb_words=6),
                    "latitude": lat,
                    "longitude": lon,
                    "zone_code": self._generate_zone_code(),
                    "operator": random.choice(["City Parking", "Downtown Ops", "Private Lot Co."]),
                    "zone_type": random.choice(["curbside", "lot", "garage"]),
                    "capacity": random.randint(20, 300),
                    "rate_currency": "USD",
                    "rate_multiplier": round(random.uniform(0.8, 1.6), 2),
                    "is_active": 1,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "metadata": None,
                }
                self.data["parking_zones"].append(zone)

    def generate_vehicle_type_rates(self):
        print("💲 Generating global vehicle type rates...")
        # Base rates per hour for each vehicle_type
        base_rates = {
            "car": 2.5,
            "motorcycle": 1.0,
            "van": 3.5,
            "truck": 4.0,
            "ev": 3.0,
        }
        for vt in self.data["vehicle_types"]:
            rate = base_rates.get(vt["code"], round(random.uniform(1.0, 4.0), 2))
            self.data["vehicle_type_rates"].append({
                "id": self.get_id("vehicle_type_rates"),
                "vehicle_type_id": vt["id"],
                "rate_per_hour": round(rate, 2),
                "currency": "USD",
                "created_at": datetime.now().isoformat(),
            })

    def generate_users(self):
        print("👥 Generating users...")
        for i in range(self.config["num_users"]):
            first = fake.first_name()
            last = fake.last_name()
            full_name = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}{i}@example.com"
            user = {
                "id": self.get_id("users"),
                "email": email,
                "password": fake.password(length=10),
                "full_name": full_name,
                "phone_number": fake.phone_number(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "status": random.choice(["active", "active", "disabled"]),
                "settings": None,
                "metadata": None,
            }
            self.data["users"].append(user)

    def generate_user_locations(self):
        print("🏠 Generating user locations from static locations.json (one per user)...")
        for user in self.data["users"]:
            # Each user gets exactly one location
            # Get next location from static locations (cycles through all before repeating)
            static_loc = self._get_next_static_location()
            
            # Use the name from static location as address, or generate one if not available
            address = static_loc.get("name", fake.address().replace("\n", ", "))
            lat = static_loc.get("lat", static_loc.get("latitude"))
            lon = static_loc.get("lon", static_loc.get("longitude"))
            
            loc = {
                "id": self.get_id("user_locations"),
                "user_id": user["id"],
                "label": random.choice(["Home", "Work", "Other"]),
                "address": address,
                "latitude": lat,
                "longitude": lon,
                "is_default": 1,  # Since each user has only one location, it's always default
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "metadata": None,
            }
            self.data["user_locations"].append(loc)

    def generate_vehicles(self):
        print("🚘 Generating vehicles...")
        makes = ["Toyota", "Honda", "Ford", "Chevrolet", "Tesla", "BMW", "Mercedes"]
        models = ["Model S", "Civic", "Corolla", "F-150", "Camry", "3 Series", "Sprinter"]
        colors = ["Red", "Blue", "Black", "White", "Silver", "Green"]

        all_vehicle_types = self.data["vehicle_types"]
        for user in self.data["users"]:
            count = self.config["vehicles_per_user"]
            for _ in range(count):
                vt = random.choice(all_vehicle_types)
                plate = self._unique_plate()
                year = random.randint(2005, datetime.now().year)
                vehicle = {
                    "id": self.get_id("vehicles"),
                    "user_id": user["id"],
                    "nickname": random.choice(["Daily", "Work", "Beast", "Sparky", None]),
                    "make": random.choice(makes),
                    "model": random.choice(models),
                    "color": random.choice(colors),
                    "year": year,
                    "plate_number": plate,
                    "vehicle_type_id": vt["id"],
                    "is_default": 1,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "metadata": None,
                }
                self.data["vehicles"].append(vehicle)

    def _unique_plate(self) -> str:
        """Generate a unique 8-character alphanumeric plate number."""
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        existing = {v["plate_number"] for v in self.data["vehicles"]}
        while True:
            plate = ''.join(random.choice(chars) for _ in range(8))
            if plate not in existing:
                return plate

    def generate_payment_methods(self):
        print("💳 Generating payment methods...")
        providers = ["VISA", "Mastercard", "Amex", "Discover", "Stripe Wallet"]
        for user in self.data["users"]:
            if random.random() < self.config["payment_methods_percent"]:
                # 1-2 payment methods
                for _ in range(random.randint(1, 2)):
                    card_num = f"{random.randint(1000_0000_0000_000, 9999_9999_9999_999)}"
                    pm = {
                        "id": self.get_id("payment_methods"),
                        "user_id": user["id"],
                        "type": random.choice(["credit_card", "debit_card", "wallet"]),
                        "provider": random.choice(providers),
                        "display_name": f"{random.choice(['Personal', 'Work', 'Primary'])} Card",
                        "card_number": card_num,
                        "last_four": card_num[-4:],
                        "expiry_month": random.randint(1, 12),
                        "expiry_year": datetime.now().year + random.randint(1, 5),
                        "is_default": 1 if random.random() < 0.6 else 0,
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat(),
                        "metadata": None,
                    }
                    self.data["payment_methods"].append(pm)

    def generate_parking_history(self):
        print("🧾 Generating parking history (bookings)...")
        start_date = datetime.fromisoformat(self.config["start_date"])
        end_date = datetime.fromisoformat(self.config["end_date"])
        zone_ids = [z["id"] for z in self.data["parking_zones"]]
        vehicle_rate_map = {r["vehicle_type_id"]: r for r in self.data["vehicle_type_rates"]}

        statuses = [ "active","completed", "expired"]
        for user in self.data["users"]:
            user_vehicles = [v for v in self.data["vehicles"] if v["user_id"] == user["id"]]
            if not user_vehicles:
                continue

            for _ in range(random.randint(1, self.config["history_per_user"])):
                v = random.choice(user_vehicles)
                zone = random.choice(self.data["parking_zones"])
                # schedule within start..end
                day_span = (end_date - start_date).days
                start_dt = start_date + timedelta(days=random.randint(0, max(0, day_span)))
                start_time = datetime.combine(start_dt, datetime.min.time()) + timedelta(
                    hours=random.randint(6, 22),
                    minutes=random.choice([0, 15, 30, 45])
                )
                planned_minutes = random.randint(15, 8 * 60)  # up to 8 hours
                actual_minutes = planned_minutes + random.randint(-30, 120)

                # charge calculation: base rate * multiplier * hours (rounded)
                rate_record = vehicle_rate_map.get(v["vehicle_type_id"])
                base_rate = rate_record["rate_per_hour"] if rate_record else 2.5
                multiplier = zone["rate_multiplier"]
                hours_charged = max(0.25, round(actual_minutes / 60.0, 2))
                charged_amount = round(base_rate * multiplier * hours_charged, 2)

                ph = {
                    "id": self.get_id("parking_history"),
                    "user_id": user["id"],
                    "vehicle_id": v["id"],
                    "parking_zone_id": zone["id"],
                    "start_time": start_time.isoformat(),
                    "planned_end_time": (start_time + timedelta(minutes=planned_minutes)).isoformat(),
                    "actual_end_time": (start_time + timedelta(minutes=actual_minutes)).isoformat(),
                    "planned_duration_minutes": planned_minutes,
                    "actual_duration_minutes": actual_minutes,
                    "charged_amount": charged_amount,
                    "currency": zone.get("rate_currency", "USD"),
                    "status": random.choice(statuses),
                    "metadata": None,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                }
                self.data["parking_history"].append(ph)

    def generate_notifications(self):
        print("🔔 Generating notifications...")
        notif_types = [
            ("reminder", "Parking Reminder"),
            ("payment", "Payment Receipt"),
            ("extension", "Parking Extended"),
            ("zone_alert", "Zone Alert"),
        ]
        # Create notifications linked to some parking_history rows and users
        for user in self.data["users"]:
            # 0-4 notifications per user
            for _ in range(random.randint(0, 4)):
                nt = random.choice(notif_types)
                related_history = None
                user_history = [h for h in self.data["parking_history"] if h["user_id"] == user["id"]]
                if user_history and random.random() < 0.7:
                    related_history = random.choice(user_history)["id"]

                note = {
                    "id": self.get_id("notifications"),
                    "user_id": user["id"],
                    "notification_type": nt[0],
                    "title": nt[1],
                    "message": f"{nt[1]}: {fake.sentence(nb_words=8)}",
                    "related_parking_history_id": related_history,
                    "is_read": 1 if random.random() < 0.6 else 0,
                    "read_at": datetime.now().isoformat() if random.random() < 0.5 else None,
                    "created_at": datetime.now().isoformat(),
                    "expires_at": (datetime.now() + timedelta(days=30)).isoformat(),
                    "metadata": None,
                }
                self.data["notifications"].append(note)

    # ----------------
    # Persistence
    # ----------------

    def save_all(self):
        print("\n💾 Saving data to files...")
        for table_name, records in self.data.items():
            if not records:
                continue
            camel_records = [convert_keys_to_camel(rec) for rec in records]
            filename = self.output_dir / f"mock-{table_name}.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(camel_records, f, indent=2, ensure_ascii=False)
            print(f"   ✓ {filename} ({len(records)} records)")

        # summary
        summary = {
            "generated_at": datetime.now().isoformat(),
            "config": self.config,
            "statistics": {k: len(v) for k, v in self.data.items()},
        }
        summary_file = self.output_dir / "summary.json"
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        print(f"\n📊 Summary saved to {summary_file}")
        print("\n✨ All parking data saved to '{}'".format(self.output_dir))


# ----------------
# CLI Entry Point
# ----------------

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate parking sandbox data")
    parser.add_argument("--users", type=int, default=CONFIG["num_users"], help="Number of users")
    parser.add_argument("--vehicles-per-user", type=int, default=CONFIG["vehicles_per_user"])
    parser.add_argument("--locations-per-user", type=int, default=CONFIG["locations_per_user"])
    parser.add_argument("--zones", type=int, default=CONFIG["zones_count"], help="Number of parking zones")
    parser.add_argument("--history-per-user", type=int, default=CONFIG["history_per_user"])
    parser.add_argument("--output", type=str, default=CONFIG["output_dir"], help="Output directory")
    parser.add_argument("--start-date", type=str, default=CONFIG["start_date"])
    parser.add_argument("--end-date", type=str, default=CONFIG["end_date"])
    parser.add_argument("--bbox", type=float, nargs=4,
                        default=list(CONFIG["bbox"]),
                        help="Bounding box: min_lon min_lat max_lon max_lat")
    args = parser.parse_args()

    config = CONFIG.copy()
    config["num_users"] = max(1, args.users)
    config["vehicles_per_user"] = max(0, args.vehicles_per_user)
    config["locations_per_user"] = max(1, args.locations_per_user)
    config["zones_count"] = max(1, args.zones)
    config["history_per_user"] = max(0, args.history_per_user)
    config["output_dir"] = args.output
    config["start_date"] = args.start_date
    config["end_date"] = args.end_date
    config["bbox"] = tuple(args.bbox)

    generator = ParkingDataGenerator(config)
    generator.generate_all()


if __name__ == "__main__":
    main()

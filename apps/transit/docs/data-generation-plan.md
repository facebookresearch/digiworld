<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Transit App - Mock Data Generation Plan

## Overview

This document outlines the strategy for generating realistic mock data for the Transit app. The data generation pipeline follows the established pattern used in other apps in the monorepo, using Python scripts with SQLite and realistic data patterns.

## Data Generation Pipeline Location

```
python-agent-to-app-interaction-api/
  data_generation_pipeline/
    transit/
      generators/
        - users.py
        - transit_network.py
        - stops.py
        - routes.py
        - schedules.py
        - real_time.py
        - trips.py
        - alerts.py
        - bikes.py
      config/
        - city_config.json
        - transit_types.json
        - fare_structure.json
      utils/
        - geo_utils.py
        - time_utils.py
        - name_generator.py
      transit_pipeline.py
      validate_data.py
```

## Generation Order

Data must be generated in dependency order:

1. **Users** (independent)
2. **Transit Lines** (independent)
3. **Stops** (independent, but geographically clustered)
4. **Routes** (depends on: Transit Lines)
5. **Route Stops** (depends on: Routes, Stops)
6. **Schedules** (depends on: Routes)
7. **Real-Time Arrivals** (depends on: Routes, Stops, Schedules)
8. **Service Alerts** (depends on: Transit Lines, Routes)
9. **Bike Stations** (independent, near transit stops)
10. **Saved Routes** (depends on: Users, Stops)
11. **Trip Plans** (depends on: Users, Routes, Stops)
12. **Trip Legs** (depends on: Trip Plans, Routes)
13. **User Notifications** (depends on: Users, Trips, Alerts)
14. **Rideshare Estimates** (independent, on-demand generation)

## City Configuration

### Default City: Metro City

```json
{
  "city_name": "Metro City",
  "city_center": {
    "latitude": 40.7589,
    "longitude": -73.9851
  },
  "city_bounds": {
    "north": 40.8800,
    "south": 40.6900,
    "east": -73.7000,
    "west": -74.0200
  },
  "neighborhoods": [
    {
      "name": "Downtown",
      "center": [40.7589, -73.9851],
      "radius_km": 2.5,
      "density": "high"
    },
    {
      "name": "Midtown",
      "center": [40.7549, -73.9840],
      "radius_km": 3.0,
      "density": "high"
    },
    {
      "name": "Uptown",
      "center": [40.7789, -73.9800],
      "radius_km": 2.0,
      "density": "medium"
    },
    {
      "name": "Riverside",
      "center": [40.7389, -73.9900],
      "radius_km": 1.8,
      "density": "medium"
    },
    {
      "name": "Eastside",
      "center": [40.7489, -73.9650],
      "radius_km": 2.2,
      "density": "medium"
    },
    {
      "name": "Suburbs North",
      "center": [40.8200, -73.9700],
      "radius_km": 4.0,
      "density": "low"
    },
    {
      "name": "Suburbs South",
      "center": [40.7000, -73.9900],
      "radius_km": 3.5,
      "density": "low"
    }
  ],
  "major_landmarks": [
    {"name": "Central Station", "coords": [40.7589, -73.9851]},
    {"name": "City Airport", "coords": [40.7769, -73.8740]},
    {"name": "University Campus", "coords": [40.8075, -73.9626]},
    {"name": "Shopping District", "coords": [40.7614, -73.9776]},
    {"name": "Business Park", "coords": [40.7489, -73.9780]}
  ]
}
```

## 1. User Generation

### Specifications

- **Count**: 100 users
- **Distribution**:
  - 40% regular commuters (have home/work addresses)
  - 30% occasional users
  - 20% tourists/visitors
  - 10% students

### Algorithm

```python
def generate_users(count=100):
    users = []
    
    for i in range(count):
        user_type = random.choices(
            ['commuter', 'occasional', 'tourist', 'student'],
            weights=[0.4, 0.3, 0.2, 0.1]
        )[0]
        
        user = {
            'user_id': i + 1,
            'username': generate_username(),
            'email': f'user{i+1}@transit.demo',
            'phone': generate_phone(),
            'password_hash': hash_password('password123'),
            'created_at': random_date_last_year(),
            'notification_enabled': random.choice([True, False]),
            'theme_preference': random.choice(['dark', 'light', 'auto']),
        }
        
        if user_type == 'commuter':
            user['home_address'] = random_residential_area()
            user['home_latitude'], user['home_longitude'] = geocode(user['home_address'])
            user['work_address'] = random_business_area()
            user['work_latitude'], user['work_longitude'] = geocode(user['work_address'])
            user['preferred_transit_modes'] = ['bus', 'subway']
        
        elif user_type == 'student':
            user['home_address'] = random_residential_area()
            user['home_latitude'], user['home_longitude'] = geocode(user['home_address'])
            user['work_address'] = "University Campus"
            user['work_latitude'], user['work_longitude'] = UNIVERSITY_COORDS
            user['preferred_transit_modes'] = ['bus', 'bike']
        
        users.append(user)
    
    return users
```

### Data Validation
- All emails unique
- Phone numbers valid format
- Coordinates within city bounds
- At least 30% have home/work set

## 2. Transit Lines Generation

### Specifications

- **Subway Lines**: 4 lines
- **Bus Lines**: 8 lines
- **Train Lines**: 2 lines (commuter rail)
- **Streetcar Lines**: 2 lines

### Line Characteristics

```python
TRANSIT_TYPES = {
    'subway': {
        'frequency_peak': 6,      # minutes
        'frequency_offpeak': 12,
        'service_hours': (5, 24),
        'avg_speed_kmh': 40,
        'stop_spacing_km': 1.0,
        'colors': ['#FF0000', '#0000FF', '#00FF00', '#FFFF00']
    },
    'bus': {
        'frequency_peak': 10,
        'frequency_offpeak': 20,
        'service_hours': (6, 23),
        'avg_speed_kmh': 25,
        'stop_spacing_km': 0.4,
        'colors': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9', '#74B9FF', '#A29BFE']
    },
    'train': {
        'frequency_peak': 15,
        'frequency_offpeak': 30,
        'service_hours': (5, 23),
        'avg_speed_kmh': 60,
        'stop_spacing_km': 3.0,
        'colors': ['#6C5CE7', '#FD79A8']
    },
    'streetcar': {
        'frequency_peak': 8,
        'frequency_offpeak': 15,
        'service_hours': (7, 22),
        'avg_speed_kmh': 20,
        'stop_spacing_km': 0.5,
        'colors': ['#FDCB6E', '#E17055']
    }
}
```

### Algorithm

```python
def generate_transit_lines():
    lines = []
    line_id = 1
    
    for transit_type, config in TRANSIT_TYPES.items():
        count = config.get('count', len(config['colors']))
        
        for i in range(count):
            line = {
                'line_id': line_id,
                'line_name': f"{transit_type.title()} Line {chr(65+i)}",
                'line_number': f"{transit_type[0].upper()}{i+1}",
                'transit_type': transit_type,
                'color_code': config['colors'][i],
                'operator_name': 'Metro Transit Authority',
                'status': 'active',
                'is_bike_allowed': transit_type in ['train', 'subway'],
                'accessibility_level': 'full',
                'service_hours_start': f"{config['service_hours'][0]:02d}:00",
                'service_hours_end': f"{config['service_hours'][1]:02d}:00",
                'frequency_peak_minutes': config['frequency_peak'],
                'frequency_offpeak_minutes': config['frequency_offpeak'],
                'created_at': datetime.now().isoformat()
            }
            lines.append(line)
            line_id += 1
    
    return lines
```

## 3. Stop Generation

### Specifications

- **Total Stops**: 150-200
- **Distribution**:
  - High density areas: 1 stop per 0.3 km²
  - Medium density: 1 stop per 0.6 km²
  - Low density: 1 stop per 1.2 km²

### Stop Types

```python
STOP_CONFIGS = {
    'major_station': {
        'probability': 0.10,
        'features': {
            'has_shelter': True,
            'has_bench': True,
            'has_lighting': True,
            'is_wheelchair_accessible': True,
            'has_elevator': True,
            'has_escalator': True,
            'has_tactile_paving': True,
            'parking_available': True,
            'bike_parking_available': True
        }
    },
    'station': {
        'probability': 0.30,
        'features': {
            'has_shelter': True,
            'has_bench': True,
            'has_lighting': True,
            'is_wheelchair_accessible': True,
            'has_elevator': random.choice([True, False]),
            'has_escalator': False,
            'has_tactile_paving': True,
            'parking_available': random.choice([True, False]),
            'bike_parking_available': True
        }
    },
    'regular_stop': {
        'probability': 0.60,
        'features': {
            'has_shelter': random.choice([True, False]),
            'has_bench': random.choice([True, False]),
            'has_lighting': True,
            'is_wheelchair_accessible': random.choice([True, False]),
            'has_elevator': False,
            'has_escalator': False,
            'has_tactile_paving': random.choice([True, False]),
            'parking_available': False,
            'bike_parking_available': random.choice([True, False])
        }
    }
}
```

### Algorithm

```python
def generate_stops(neighborhoods, count=180):
    stops = []
    stop_id = 1
    
    for neighborhood in neighborhoods:
        # Calculate stops per neighborhood based on density
        if neighborhood['density'] == 'high':
            stops_in_area = int(count * 0.35)
        elif neighborhood['density'] == 'medium':
            stops_in_area = int(count * 0.40)
        else:
            stops_in_area = int(count * 0.25)
        
        for i in range(stops_in_area):
            # Generate random point within neighborhood radius
            lat, lon = random_point_in_circle(
                neighborhood['center'],
                neighborhood['radius_km']
            )
            
            # Determine stop type
            stop_type = random.choices(
                list(STOP_CONFIGS.keys()),
                weights=[c['probability'] for c in STOP_CONFIGS.values()]
            )[0]
            
            stop = {
                'stop_id': stop_id,
                'stop_name': generate_stop_name(neighborhood['name'], i),
                'stop_code': f"STP{stop_id:04d}",
                'latitude': lat,
                'longitude': lon,
                'stop_type': stop_type,
                'zone_id': neighborhood['name'][:3].upper(),
                **STOP_CONFIGS[stop_type]['features'],
                'address': generate_address(lat, lon),
                'created_at': datetime.now().isoformat()
            }
            
            stops.append(stop)
            stop_id += 1
    
    return stops
```

### Stop Naming Patterns

```python
def generate_stop_name(neighborhood, index):
    patterns = [
        f"{neighborhood} Center",
        f"{neighborhood} Station",
        f"{random.choice(STREET_NAMES)} & {random.choice(STREET_NAMES)}",
        f"{random.choice(LANDMARK_TYPES)} {neighborhood}",
        f"{neighborhood} {random.choice(['North', 'South', 'East', 'West'])}",
        f"{random.choice(STREET_NAMES)} Station"
    ]
    return random.choice(patterns)

STREET_NAMES = ['Main St', 'Oak Ave', 'Park Rd', 'Broadway', 'Central Ave', 
                'River St', 'Hill Dr', 'Lake Blvd', 'Forest Way', 'Market St']
LANDMARK_TYPES = ['Plaza', 'Square', 'Park', 'Mall', 'Center', 'Commons']
```

## 4. Route Generation

### Algorithm

```python
def generate_routes(transit_lines, stops):
    routes = []
    route_id = 1
    
    for line in transit_lines:
        # Most lines have 2 routes (bidirectional)
        directions = ['northbound', 'southbound'] if line['transit_type'] in ['subway', 'train'] else ['eastbound', 'westbound']
        
        for direction in directions:
            # Select stops for this route based on line type
            route_stops = select_stops_for_route(
                stops,
                line['transit_type'],
                direction
            )
            
            route = {
                'route_id': route_id,
                'line_id': line['line_id'],
                'route_name': f"{line['line_name']} - {direction.title()}",
                'route_direction': direction,
                'route_variant': 'local',
                'headsign': route_stops[-1]['stop_name'],
                'is_active': True,
                'operating_days': json.dumps(['mon','tue','wed','thu','fri','sat','sun']),
                'created_at': datetime.now().isoformat()
            }
            
            routes.append(route)
            
            # Generate route_stops associations
            generate_route_stops(route_id, route_stops, line['transit_type'])
            
            route_id += 1
    
    return routes
```

## 5. Schedule Generation

### Time Patterns

```python
SCHEDULE_PATTERNS = {
    'weekday_peak': {
        'start_time': '06:00',
        'end_time': '09:00',
        'frequency_minutes': 'line_frequency_peak',
        'days': [1,2,3,4,5]  # Mon-Fri
    },
    'weekday_midday': {
        'start_time': '09:00',
        'end_time': '16:00',
        'frequency_minutes': 'line_frequency_offpeak',
        'days': [1,2,3,4,5]
    },
    'weekday_evening_peak': {
        'start_time': '16:00',
        'end_time': '19:00',
        'frequency_minutes': 'line_frequency_peak',
        'days': [1,2,3,4,5]
    },
    'weekday_evening': {
        'start_time': '19:00',
        'end_time': '23:00',
        'frequency_minutes': 'line_frequency_offpeak * 1.5',
        'days': [1,2,3,4,5]
    },
    'weekend': {
        'start_time': '07:00',
        'end_time': '23:00',
        'frequency_minutes': 'line_frequency_offpeak * 1.2',
        'days': [6,7]  # Sat-Sun
    }
}
```

### Algorithm

```python
def generate_schedules(routes, transit_lines):
    schedules = []
    schedule_id = 1
    
    for route in routes:
        line = next(l for l in transit_lines if l['line_id'] == route['line_id'])
        
        for pattern_name, pattern in SCHEDULE_PATTERNS.items():
            start = datetime.strptime(pattern['start_time'], '%H:%M')
            end = datetime.strptime(pattern['end_time'], '%H:%M')
            
            # Calculate frequency for this pattern
            if isinstance(pattern['frequency_minutes'], str):
                freq = eval(pattern['frequency_minutes'].replace(
                    'line_frequency_peak', str(line['frequency_peak_minutes'])
                ).replace(
                    'line_frequency_offpeak', str(line['frequency_offpeak_minutes'])
                ))
            else:
                freq = pattern['frequency_minutes']
            
            # Generate departures
            current = start
            while current <= end:
                schedule = {
                    'schedule_id': schedule_id,
                    'route_id': route['route_id'],
                    'schedule_type': 'weekday' if 1 in pattern['days'] else 'weekend',
                    'departure_time': current.strftime('%H:%M:%S'),
                    'days_of_week': json.dumps(pattern['days']),
                    'valid_from': (datetime.now() - timedelta(days=30)).date().isoformat(),
                    'valid_until': (datetime.now() + timedelta(days=90)).date().isoformat(),
                    'is_active': True,
                    'trip_id': f"T{route['route_id']:03d}_{schedule_id:05d}",
                    'created_at': datetime.now().isoformat()
                }
                schedules.append(schedule)
                schedule_id += 1
                current += timedelta(minutes=freq)
    
    return schedules
```

## 6. Real-Time Arrivals Generation

### Dynamic Generation Logic

Real-time arrivals should be generated on-demand based on current time:

```python
def generate_real_time_arrivals(routes, stops, schedules, current_time=None):
    if current_time is None:
        current_time = datetime.now()
    
    arrivals = []
    arrival_id = 1
    
    # Look ahead window: next 2 hours
    end_time = current_time + timedelta(hours=2)
    
    for schedule in schedules:
        # Check if schedule applies today
        day_of_week = current_time.isoweekday()
        days_list = json.loads(schedule['days_of_week'])
        if day_of_week not in days_list:
            continue
        
        # Parse departure time
        departure_today = datetime.combine(
            current_time.date(),
            datetime.strptime(schedule['departure_time'], '%H:%M:%S').time()
        )
        
        if departure_today < current_time or departure_today > end_time:
            continue
        
        # Get route stops
        route_stops = get_route_stops(schedule['route_id'])
        
        for route_stop in route_stops:
            # Calculate arrival at this stop
            arrival_at_stop = departure_today + timedelta(
                minutes=route_stop['arrival_offset_minutes']
            )
            
            # Add realistic delay
            delay = generate_realistic_delay()
            estimated_time = arrival_at_stop + timedelta(minutes=delay)
            
            # Generate occupancy
            occupancy = random.choices(
                ['empty', 'seats_available', 'standing_room', 'full'],
                weights=[0.10, 0.50, 0.30, 0.10]
            )[0]
            
            arrival = {
                'arrival_id': arrival_id,
                'route_id': schedule['route_id'],
                'stop_id': route_stop['stop_id'],
                'schedule_id': schedule['schedule_id'],
                'scheduled_time': arrival_at_stop.isoformat(),
                'estimated_time': estimated_time.isoformat(),
                'delay_minutes': delay,
                'vehicle_id': f"V{schedule['route_id']:03d}_{random.randint(100, 999)}",
                'occupancy_status': occupancy,
                'occupancy_percentage': get_occupancy_percentage(occupancy),
                'is_cancelled': random.random() < 0.01,  # 1% cancellation rate
                'last_updated': current_time.isoformat()
            }
            arrivals.append(arrival)
            arrival_id += 1
    
    return arrivals

def generate_realistic_delay():
    """Generate delay following realistic distribution"""
    rand = random.random()
    if rand < 0.70:  # 70% on time (±1 min)
        return random.randint(-1, 1)
    elif rand < 0.90:  # 20% minor delay (2-5 min)
        return random.randint(2, 5)
    elif rand < 0.98:  # 8% moderate delay (6-10 min)
        return random.randint(6, 10)
    else:  # 2% major delay (11-20 min)
        return random.randint(11, 20)
```

## 7. Trip Plans Generation

### User Trip Patterns

```python
def generate_trip_plans(users, routes, stops, count_per_user=(2, 8)):
    trip_plans = []
    trip_plan_id = 1
    
    for user in users:
        num_trips = random.randint(*count_per_user)
        
        for _ in range(num_trips):
            # Determine trip type
            trip_type = determine_trip_type(user)
            
            if trip_type == 'commute' and user.get('home_address'):
                origin = {
                    'lat': user['home_latitude'],
                    'lon': user['home_longitude']
                }
                destination = {
                    'lat': user['work_latitude'],
                    'lon': user['work_longitude']
                }
                time = random_commute_time()
            else:
                origin = random_location()
                destination = random_location()
                time = random_time_of_day()
            
            # Find route between origin and destination
            trip = plan_route(origin, destination, time, routes, stops)
            
            if trip:
                trip_plan = {
                    'trip_plan_id': trip_plan_id,
                    'user_id': user['user_id'],
                    **trip,
                    'trip_status': random.choice(['completed', 'cancelled']),
                    'created_at': random_datetime_last_month().isoformat()
                }
                trip_plans.append(trip_plan)
                
                # Generate trip legs
                generate_trip_legs(trip_plan_id, trip['legs'])
                
                trip_plan_id += 1
    
    return trip_plans
```

## Summary Statistics

### Expected Data Volumes

| Entity | Count |
|--------|-------|
| Users | 100 |
| Transit Lines | 16 |
| Stops | 180 |
| Routes | 32 |
| Route Stops | ~20 per route = 640 |
| Schedules | ~50 per route = 1,600 |
| Real-Time Arrivals | Generated dynamically (~500-1000 active) |
| Service Alerts | 5-10 active |
| Trip Plans | 400-800 |
| Trip Legs | ~3 per trip = 1,200-2,400 |
| Saved Routes | ~2 per user = 200 |
| Bike Stations | 40 |
| User Notifications | Generated as needed |
| Rideshare Estimates | Generated on-demand |

### Generation Time Estimates

- Users: < 1 second
- Transit Network (lines, stops, routes): 2-3 seconds
- Schedules: 3-5 seconds
- Trip History: 5-10 seconds
- **Total**: ~12-20 seconds

## Validation Checks

After generation, validate:

1. **Referential Integrity**
   - All foreign keys point to existing records
   - No orphaned records

2. **Geographic Validity**
   - All coordinates within city bounds
   - Stop spacing reasonable (not too close/far)
   - Route paths logical

3. **Temporal Validity**
   - Schedules within service hours
   - Trips have realistic durations
   - Arrivals after departures

4. **Business Logic**
   - Trip legs in correct sequence
   - Realistic trip durations
   - Valid trip statuses

5. **Data Quality**
   - No duplicate codes/references
   - Required fields populated
   - Enum values valid

## Continuous Data Refresh

For realistic testing, implement periodic refresh:

```python
# Every 30 seconds
- Regenerate real-time arrivals
- Update vehicle positions
- Simulate new service alerts (5% chance)

# Every 5 minutes
- Update bike station availability
- Regenerate rideshare estimates

# Daily
- Rotate active trips
- Generate new user activity
- Clean up old trip data
```

This ensures the app always has fresh, realistic data for testing agent interactions.



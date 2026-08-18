# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import json
import re
import unicodedata
from typing import Dict, Any, List, Optional

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.ryde.template_resolver import RydeTemplateResolver


def _normalize_location(s: str) -> str:
    """Normalize a location string for consistent matching."""
    s = unicodedata.normalize("NFKC", s).strip()
    s = s.replace("\u2018", "'").replace("\u2019", "'")
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = re.sub(r",(?=\S)", ", ", s)
    return " ".join(s.split())


class RydeScenario(Scenario):
    """Base class for ryde scenarios."""
    
    def get_available_locations(self, routes_path: Optional[str] = None) -> List[str]:
        """
        Extract all unique locations from routes.json.
        
        Args:
            routes_path: Optional path to routes.json. If not provided, uses default from state.
            
        Returns:
            List of unique location names sorted alphabetically.
        """
        if routes_path is None:
            routes_path = os.path.join(self.initial_state_path, "..", "..", "mockdata", "routes.json")
        
        if not os.path.exists(routes_path):
            return []
        
        with open(routes_path, 'r') as f:
            routes_data = json.load(f)
        
        features = routes_data.get("features", [])
        locations = set()
        
        for feature in features:
            props = feature.get("properties", {})
            if "from" in props:
                locations.add(props["from"])
            if "to" in props:
                locations.add(props["to"])
        
        return sorted(list(locations))
    
    def get_route_between(self, origin: str, destination: str, routes_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Find route data between two locations.
        
        Args:
            origin: Starting location name
            destination: Destination location name
            routes_path: Optional path to routes.json. If not provided, uses default from state.
            
        Returns:
            Dict containing route information (distance_km, time_min, coordinates) or None if not found.
        """
        if routes_path is None:
            routes_path = os.path.join(self.initial_state_path, "..", "..", "mockdata", "routes.json")
        
        if not os.path.exists(routes_path):
            return None
        
        with open(routes_path, 'r') as f:
            routes_data = json.load(f)
        
        features = routes_data.get("features", [])
        
        origin_norm = _normalize_location(origin)
        dest_norm = _normalize_location(destination)
        
        for feature in features:
            props = feature.get("properties", {})
            route_from = _normalize_location(props.get("from", ""))
            route_to = _normalize_location(props.get("to", ""))
            if route_from == origin_norm and route_to == dest_norm:
                return {
                    "distance_km": props.get("distance_km"),
                    "time_min": props.get("time_min"),
                    "coordinates": feature.get("geometry", {}).get("coordinates", [])
                }
        
        return None
    
    def get_routes_by_distance(self, min_km: float = 0, max_km: float = float('inf'), 
                                routes_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get routes filtered by distance range.
        
        Args:
            min_km: Minimum distance in kilometers (inclusive)
            max_km: Maximum distance in kilometers (inclusive)
            routes_path: Optional path to routes.json
            
        Returns:
            List of route dictionaries matching the distance criteria.
        """
        if routes_path is None:
            routes_path = os.path.join(self.initial_state_path, "..", "..", "mockdata", "routes.json")
        
        if not os.path.exists(routes_path):
            return []
        
        with open(routes_path, 'r') as f:
            routes_data = json.load(f)
        
        features = routes_data.get("features", [])
        filtered_routes = []
        
        for feature in features:
            props = feature.get("properties", {})
            distance = props.get("distance_km", 0)
            
            if min_km <= distance <= max_km:
                coords = feature.get("geometry", {}).get("coordinates", [])
                if len(coords) >= 2:
                    filtered_routes.append({
                        "from": props.get("from"),
                        "to": props.get("to"),
                        "distance_km": distance,
                        "time_min": props.get("time_min"),
                        "pickup_coordinates": coords[0],
                        "drop_coordinates": coords[-1]
                    })
        
        return filtered_routes
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create RydeTemplateResolver with location support.
        """
        return RydeTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )


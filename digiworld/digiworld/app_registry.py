# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Centralized App Registry for DigiWorld

This module provides a single source of truth for all app metadata including
bundle IDs, display names, icons, and APK information. All other modules should
import from here instead of maintaining their own hardcoded app lists.

Usage:
    from digiworld.app_registry import (
        get_bundle_id,
        get_display_name,
        get_icon,
        get_all_app_names,
        APP_REGISTRY
    )
    
    # Get bundle ID for an app
    bundle_id = get_bundle_id('email')  # 'com.andojomail.sbx'
    
    # Get all registered app names
    apps = get_all_app_names()  # ['email', 'payment', 'ryde', ...]
"""

from typing import Dict, Optional, List

# Central registry of all app metadata
# Each app has: bundle_id, display_name, icon, apk_filename, apk_key (for GitHub releases)
# The primary key is the scenario/internal name (e.g., "payment", "ecommerce", "flightbooking")
# The apk_key is the short name used in GitHub release tags (e.g., "pay", "shop", "fly")
APP_REGISTRY: Dict[str, Dict[str, str]] = {
    "email": {
        "bundle_id": "com.andojomail.sbx",
        "display_name": "Email",
        "icon": "📧",
        "apk_filename": "email-app-release.apk",
        "apk_key": "email",
    },
    "payment": {
        "bundle_id": "com.andojopay.sbx",
        "display_name": "Payment",
        "icon": "💳",
        "apk_filename": "payment-app-release.apk",
        "apk_key": "pay",
    },
    "ryde": {
        "bundle_id": "com.andojoryde.sbx",
        "display_name": "Ryde",
        "icon": "🚗",
        "apk_filename": "ryde-app-release.apk",
        "apk_key": "ryde",
    },
    "ecommerce": {
        "bundle_id": "com.andojoshop.sbx",
        "display_name": "E-Commerce",
        "icon": "🛒",
        "apk_filename": "ecommerce-app-release.apk",
        "apk_key": "shop",
    },
    "music": {
        "bundle_id": "com.andojomusic.sbx",
        "display_name": "Music",
        "icon": "🎵",
        "apk_filename": "music-app-release.apk",
        "apk_key": "music",
    },
    "eats": {
        "bundle_id": "com.andojoeats.sbx",
        "display_name": "Eats",
        "icon": "🍔",
        "apk_filename": "eats-app-release.apk",
        "apk_key": "eats",
    },
    "smarthome": {
        "bundle_id": "com.andojosmarthome.sbx",
        "display_name": "Smart Home",
        "icon": "🏠",
        "apk_filename": "smarthome-app-release.apk",
        "apk_key": "smarthome",
    },
    "video": {
        "bundle_id": "com.andojovideo.sbx",
        "display_name": "Video",
        "icon": "📺",
        "apk_filename": "video-app-release.apk",
        "apk_key": "video",
    },
    "message": {
        "bundle_id": "com.andojomessage.sbx",
        "display_name": "Messaging",
        "icon": "💬",
        "apk_filename": "message-app-release.apk",
        "apk_key": "message",
    },
    "auction": {
        "bundle_id": "com.andojoauction.sbx",
        "display_name": "Auction",
        "icon": "🔨",
        "apk_filename": "auction-app-release.apk",
        "apk_key": "auction",
    },
    "banking": {
        "bundle_id": "com.andojobank.sbx",
        "display_name": "Banking",
        "icon": "🏦",
        "apk_filename": "banking-app-release.apk",
        "apk_key": "banking",
    },
    "flightbooking": {
        "bundle_id": "com.andojofly.sbx",
        "display_name": "Flight Booking",
        "icon": "✈️",
        "apk_filename": "fly-app-release.apk",
        "apk_key": "fly",
    },
    "parking": {
        "bundle_id": "com.andojopark.sbx",
        "display_name": "Parking",
        "icon": "🅿️",
        "apk_filename": "parking-app-release.apk",
        "apk_key": "parking",
    },
    "qwikshop": {
        "bundle_id": "com.andojoqwikshop.sbx",
        "display_name": "QwikShop",
        "icon": "🛍️",
        "apk_filename": "qwikshop-app-release.apk",
        "apk_key": "qwikshop",
    },
    "transit": {
        "bundle_id": "com.andojotransit.sbx",
        "display_name": "Transit",
        "icon": "🚌",
        "apk_filename": "transit-app-release.apk",
        "apk_key": "transit",
    },
}

# Build reverse mapping from apk_key to app_name for convenience
_APK_KEY_TO_APP: Dict[str, str] = {
    data["apk_key"]: name for name, data in APP_REGISTRY.items()
}


def get_bundle_id(app_name: str) -> Optional[str]:
    """
    Get the bundle ID for an app.
    
    Args:
        app_name: Internal app name (e.g., 'email', 'payment')
        
    Returns:
        Bundle ID string or None if app not found
    """
    app = APP_REGISTRY.get(app_name)
    return app["bundle_id"] if app else None


def get_display_name(app_name: str) -> str:
    """
    Get the display name for an app.
    
    Args:
        app_name: Internal app name (e.g., 'email', 'payment')
        
    Returns:
        Display name string, or capitalized app_name if not found
    """
    app = APP_REGISTRY.get(app_name)
    return app["display_name"] if app else app_name.capitalize()


def get_icon(app_name: str) -> str:
    """
    Get the icon for an app.
    
    Args:
        app_name: Internal app name (e.g., 'email', 'payment')
        
    Returns:
        Icon string, or default icon if not found
    """
    app = APP_REGISTRY.get(app_name)
    return app["icon"] if app else "📱"


def get_all_app_names() -> List[str]:
    """
    Get list of all registered app names.
    
    Returns:
        List of app name strings
    """
    return list(APP_REGISTRY.keys())


def get_app_to_bundle_mapping() -> Dict[str, str]:
    """
    Get a mapping of app names to bundle IDs.
    
    Returns:
        Dict mapping app names to bundle IDs
    """
    return {name: data["bundle_id"] for name, data in APP_REGISTRY.items()}


def get_bundle_to_app_mapping() -> Dict[str, str]:
    """
    Get a mapping of bundle IDs to app names.
    
    Returns:
        Dict mapping bundle IDs to app names
    """
    return {data["bundle_id"]: name for name, data in APP_REGISTRY.items()}


def get_display_names() -> Dict[str, str]:
    """
    Get a mapping of app names to display names.
    
    Returns:
        Dict mapping app names to display names
    """
    return {name: data["display_name"] for name, data in APP_REGISTRY.items()}


def get_icons() -> Dict[str, str]:
    """
    Get a mapping of app names to icons.
    
    Returns:
        Dict mapping app names to icons
    """
    return {name: data["icon"] for name, data in APP_REGISTRY.items()}


def get_apk_filename(app_name: str) -> Optional[str]:
    """
    Get the APK filename for an app.
    
    Args:
        app_name: Internal app name (e.g., 'email', 'payment')
        
    Returns:
        APK filename string or None if app not found
    """
    app = APP_REGISTRY.get(app_name)
    return app["apk_filename"] if app else None


def get_apk_key(app_name: str) -> Optional[str]:
    """
    Get the APK key (GitHub release tag pattern) for an app.
    
    Args:
        app_name: Internal app name (e.g., 'email', 'payment')
        
    Returns:
        APK key string or None if app not found
    """
    app = APP_REGISTRY.get(app_name)
    return app["apk_key"] if app else None


def get_app_name_from_apk_key(apk_key: str) -> Optional[str]:
    """
    Get the internal app name from an APK key.
    
    Args:
        apk_key: APK key (e.g., 'pay', 'shop', 'fly')
        
    Returns:
        Internal app name or None if not found
    """
    return _APK_KEY_TO_APP.get(apk_key)


def get_apk_config() -> Dict[str, tuple]:
    """
    Get APK configuration in the format used by utils/app_config.py.
    
    Returns:
        Dict mapping apk_key -> (apk_filename, bundle_id, app_name)
    """
    return {
        data["apk_key"]: (data["apk_filename"], data["bundle_id"], name)
        for name, data in APP_REGISTRY.items()
    }

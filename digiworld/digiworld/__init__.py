# Copyright (c) Meta Platforms, Inc. and affiliates.
"""DigiWorld - AI testing and scenario validation framework."""

import json
import os
import shutil
import logging
from pathlib import Path
from typing import Dict

__version__ = "1.0.0"

logger = logging.getLogger(__name__)

# Re-export app registry functions for convenient access
from digiworld.app_registry import (
    APP_REGISTRY,
    get_bundle_id,
    get_display_name,
    get_icon,
    get_all_app_names,
    get_app_to_bundle_mapping,
    get_bundle_to_app_mapping,
    get_display_names,
    get_icons,
    get_apk_filename,
    get_apk_key,
    get_app_name_from_apk_key,
    get_apk_config,
)


def _get_default_state_data_path() -> str:
    """Get the default state_data path from package location."""
    package_dir = Path(__file__).parent  # digiworld/digiworld/
    return str(package_dir / "state_data") + "/"


def get_state_data_path() -> str:
    """
    Get the path to the state_data directory.
    
    If DIGIWORLD_STATE_DATA environment variable is set to a path that
    doesn't exist, the default state_data will be copied there automatically.
    
    Returns:
        Absolute path to state_data with trailing slash
        
    Example:
        >>> import digiworld
        >>> base_path = digiworld.get_state_data_path()
        >>> from digiworld.scenarios.scenario_registry import scenario_registry
        >>> scenario = scenario_registry.get_instance(
        ...     app_name='email',
        ...     task_name='Send email to',
        ...     instance_name='personal_fjohnson_4',
        ...     base_path=base_path
        ... )
    """
    # Check for environment variable override first
    env_path = os.getenv('DIGIWORLD_STATE_DATA')
    if not env_path:
        return _get_default_state_data_path()
    
    custom_path = env_path if env_path.endswith('/') else env_path + '/'
    
    # If custom path doesn't exist, copy from default
    if not os.path.exists(custom_path.rstrip('/')):
        default_path = _get_default_state_data_path()
        source = default_path.rstrip('/')
        dest = custom_path.rstrip('/')
        
        if os.path.exists(source):
            logger.info(f"Copying state_data from {source} to {dest}")
            shutil.copytree(source, dest, dirs_exist_ok=True)
            logger.info(f"Successfully initialized state_data at {dest}")
        else:
            raise FileNotFoundError(
                f"Default state_data not found at {source}. "
                f"Cannot initialize custom path."
            )
    
    return custom_path


def get_project_root() -> Path:
    """
    Get the digiworld project root directory.
    
    Returns:
        Path object pointing to project root (digiworld/)
        
    Example:
        >>> import digiworld
        >>> root = digiworld.get_project_root()
        >>> package_dir = digiworld.get_package_dir()
        >>> state_data = package_dir / "state_data"
    """
    package_dir = Path(__file__).parent
    return package_dir.parent


def get_package_dir() -> Path:
    """
    Get the digiworld package directory (where state_data and scenarios live).
    
    Returns:
        Path object pointing to package dir (digiworld/digiworld/)
        
    Example:
        >>> import digiworld
        >>> package_dir = digiworld.get_package_dir()
        >>> state_data = package_dir / "state_data"
    """
    return Path(__file__).parent


def get_apk_versions() -> Dict[str, str]:
    """
    Load minimum compatible APK versions from the apk_versions.json lockfile.
    
    Returns:
        Dict mapping apk_key (e.g., "email", "pay") to minimum semver string
        
    Raises:
        FileNotFoundError: If apk_versions.json is not found
    """
    lockfile = get_project_root() / "apk_versions.json"
    if not lockfile.exists():
        raise FileNotFoundError(f"APK versions lockfile not found: {lockfile}")
    with open(lockfile) as f:
        data = json.load(f)
    return data.get("apps", {})


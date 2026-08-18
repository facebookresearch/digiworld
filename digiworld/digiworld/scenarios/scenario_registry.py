# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.scenario_base import Scenario
from typing import Dict, Tuple, Type, List, Any, Optional
import importlib
import pkgutil
import digiworld.scenarios.scenarios
import json
import os
from pathlib import Path

import logging
logger = logging.getLogger(__name__)


def _safe_rglob(base: Path, pattern: str) -> List[Path]:
    """Collect rglob results into a list, tolerating concurrent deletions.

    During instance generation the ``instances/`` sub-trees may be
    cleaned while another thread/process is scanning.  ``rglob`` uses
    ``os.scandir`` lazily, so a directory removed between iteration
    steps raises ``FileNotFoundError`` or ``OSError``.  We retry once
    and, on a second failure, fall back to ``os.walk`` which is more
    forgiving.
    """
    for attempt in range(2):
        try:
            return list(base.rglob(pattern))
        except (FileNotFoundError, OSError) as exc:
            if attempt == 0:
                logger.debug("rglob hit a missing path (%s), retrying", exc)
                continue
            logger.warning(
                "rglob failed twice for %s/%s, falling back to os.walk: %s",
                base, pattern, exc,
            )
    results: List[Path] = []
    for dirpath, _dirnames, filenames in os.walk(base):
        for fn in filenames:
            full = Path(dirpath) / fn
            if full.match(pattern):
                results.append(full)
    return results


class ScenarioRegistry:
    def __init__(self):
        """Initialize the registry."""
        self.registry: Dict[Tuple[str, str], Type[Scenario]] = {}
        self.scenario_configs: Dict[Tuple[str, str], Dict[str, Any]] = {}
        self.instances: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        self._template_to_dir: Dict[Tuple[str, str], str] = {}
        self._dir_to_template: Dict[Tuple[str, str], str] = {}
        
        # Load everything at initialization
        self.auto_register_scenarios()
        self.auto_register_instances()

    def get_scenario_list(self) -> List[Tuple[str, str]]:
        """Get a list of all registered scenario app/task combinations."""
        return list(self.registry.keys())

    def get_instance_list(self) -> List[Tuple[str, str, str]]:
        """Get a list of all registered instances (app, task, instance_name)."""
        return list(self.instances.keys())

    def get_scenario(self, app_name: str, task_name: str, *args, **kwargs) -> Scenario:
        """Retrieve and instantiate a scenario for the given task."""
        if (app_name, task_name) not in self.registry:
            raise ValueError(f"Unknown app/task combination: {task_name} on {app_name}")
        return self.registry[(app_name, task_name)](*args, **kwargs)

    def get_instance(self, app_name: str, task_name: str, instance_name: str, *args, **kwargs) -> Scenario:
        """Retrieve and instantiate a scenario instance with pre-configured parameters."""
        if (app_name, task_name) not in self.registry:
            raise ValueError(f"Unknown app/task combination: {task_name} on {app_name}")
        
        if (app_name, task_name, instance_name) not in self.instances:
            raise ValueError(f"Unknown instance: {instance_name} for {task_name} on {app_name}")
        
        instance_config = self.instances[(app_name, task_name, instance_name)]
        merged_kwargs = {**instance_config.get('parameters', {}), **kwargs}
        
        return self.registry[(app_name, task_name)](*args, **merged_kwargs)

    def get_instance_config(self, app_name: str, task_name: str, instance_name: str) -> Dict[str, Any]:
        """Get the configuration for a specific instance."""
        if (app_name, task_name, instance_name) not in self.instances:
            raise ValueError(f"Unknown instance: {instance_name} for {task_name} on {app_name}")
        
        return self.instances[(app_name, task_name, instance_name)]

    def auto_register_scenarios(self):
        """
        Automatically discover and register scenarios by scanning for scenario_config.json files.
        """
        
        # Get the base scenarios path
        scenarios_path = Path(digiworld.scenarios.scenarios.__path__[0])
        
        # Walk through all directories looking for scenario configs
        for config_file in _safe_rglob(scenarios_path, "scenario_config.json"):
            if config_file.parent.name == "instances":
                continue  # Skip instance configs
                
            try:
                # Load the config
                with open(config_file, 'r') as f:
                    config = json.load(f)
                
                # Import the scenario module
                scenario_file = config_file.parent / "scenario.py"
                if not scenario_file.exists():
                    logger.warning(f"No scenario.py found for {config_file}")
                    continue
                
                # Build module name from path
                relative_path = scenario_file.relative_to(scenarios_path)
                module_name = str(relative_path).replace(os.sep, ".").replace(".py", "")
                full_module_name = f"digiworld.scenarios.scenarios.{module_name}"
                
                module = importlib.import_module(full_module_name)
                
                # Get the scenario class
                scenario_class = getattr(module, config["scenario_class"])
                
                # Register it using the task template from config
                self.register(
                    config["app_name"],
                    config["task_name"],
                    scenario_class
                )
                self.scenario_configs[(config["app_name"], config["task_name"])] = config

                dir_name = config_file.parent.name
                self._template_to_dir[(config["app_name"], config["task_name"])] = dir_name
                self._dir_to_template[(config["app_name"], dir_name)] = config["task_name"]
                
            except Exception as e:
                logger.error(f"Failed to register scenario from {config_file}: {e}")

    def auto_register_instances(self):
        """
        Automatically discover and load instance configuration files.
        """
        scenarios_path = Path(digiworld.scenarios.scenarios.__path__[0])
        
        # Look for instance_config.json files in the instances directories
        for config_file in _safe_rglob(scenarios_path, "instances/*/instance_config.json"):
            try:
                self._load_instance_config(config_file)
            except Exception as e:
                logger.error(f"Failed to load instance config {config_file}: {e}")

    def _load_instance_config(self, config_path: Path):
        """Load a single instance configuration file."""
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Extract app, task, and instance names from the path
        # Expected structure: .../scenarios/scenarios/{app}/{task}/instances/{instance_name}/instance_config.json
        path_parts = config_path.parts
        
        # Find the scenarios/scenarios directory and extract app/task/instance from the path
        scenarios_idx = None
        for i, part in enumerate(path_parts):
            if part == "scenarios" and i + 1 < len(path_parts) and path_parts[i + 1] == "scenarios":
                scenarios_idx = i + 2  # Point to the directory after "scenarios/scenarios"
                break
        
        if scenarios_idx is None or scenarios_idx + 3 >= len(path_parts):
            logger.warning(f"Could not parse app/task/instance from path: {config_path}")
            return
        
        app_name = path_parts[scenarios_idx]
        task_name = path_parts[scenarios_idx + 1]
        # instances directory is at scenarios_idx + 2, instance_name is at scenarios_idx + 3
        instance_name = path_parts[scenarios_idx + 3]
        
        # Load the corresponding scenario config to get the task template
        scenario_config_path = config_path.parent.parent.parent / "scenario_config.json"
        if scenario_config_path.exists():
            with open(scenario_config_path, 'r') as f:
                scenario_config = json.load(f)
                task_name = scenario_config.get("task_name", task_name)
        else:
            task_name = task_name

        # Skip instances with empty compatible_profiles — they have no
        # valid profiles to run against (e.g. trivially completed on all).
        profiles = config.get("compatible_profiles")
        if isinstance(profiles, list) and len(profiles) == 0:
            logger.debug(
                "Skipping instance %s/%s/%s: no compatible profiles",
                app_name, task_name, instance_name,
            )
            return

        # Register the instance
        self.instances[(app_name, task_name, instance_name)] = config

    def get_dir_name(self, app_name: str, task_name: str) -> str:
        """Get the directory name for a scenario given its app and task template."""
        return self._template_to_dir.get((app_name, task_name), task_name)

    def get_task_template(self, app_name: str, dir_name: str) -> str:
        """Get the task template string for a scenario given its app and directory name."""
        return self._dir_to_template.get((app_name, dir_name), dir_name)

    def register(self, app_name: str, task_name: str, scenario_cls: Type[Scenario]):
        """Register a scenario class."""
        self.registry[(app_name, task_name)] = scenario_cls

    def register_instance(self, app_name: str, task_name: str, instance_name: str, config: Dict[str, Any]):
        """Manually register an instance configuration."""
        self.instances[(app_name, task_name, instance_name)] = config

    def print_scenario_classes(self):
        """Print all registered scenario classes with their modules."""
        logger.info("\n### Registered Scenario Classes ###")
        for (app_name, task_name), scenario_cls in self.registry.items():
            module_name = scenario_cls.__module__
            class_name = scenario_cls.__name__
            logger.info(f"{app_name}: {task_name}: {module_name}.{class_name}")

    def save_validation_data(self, app_name: str, task_name: str, instance_name: str, validation_data: Dict[str, Any]):
        """Save validation data directly to the instance configuration file."""
        if (app_name, task_name, instance_name) not in self.instances:
            raise ValueError(f"Unknown instance: {instance_name} for {task_name} on {app_name}")
        
        # Find the instance config file path
        scenarios_path = Path(digiworld.scenarios.scenarios.__path__[0])
        config_path = None
        
        # Look for the instance config file
        for instance_config_file in _safe_rglob(scenarios_path, f"instances/{instance_name}/instance_config.json"):
            # Verify this is the right app/task by checking the path structure
            path_parts = instance_config_file.parts
            scenarios_idx = None
            for i, part in enumerate(path_parts):
                if part == "scenarios" and i + 1 < len(path_parts) and path_parts[i + 1] == "scenarios":
                    scenarios_idx = i + 2
                    break
            
            if scenarios_idx and scenarios_idx + 1 < len(path_parts):
                file_app = path_parts[scenarios_idx]
                file_task = path_parts[scenarios_idx + 1]
                
                # Load the corresponding scenario config to get the task template
                scenario_config_path = instance_config_file.parent.parent.parent / "scenario_config.json"
                if scenario_config_path.exists():
                    with open(scenario_config_path, 'r') as f:
                        scenario_config = json.load(f)
                        file_task_template = scenario_config.get("task_name", file_task)  # Changed from "task_template" to "task_name"
                else:
                    file_task_template = file_task
                
                if file_app == app_name and file_task_template == task_name:
                    config_path = instance_config_file
                    break
        
        if not config_path:
            raise FileNotFoundError(f"Could not find instance config file for {app_name}/{task_name}/{instance_name}")
        
        # Load the current config
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Add/update validation data
        config["validation"] = validation_data
        
        # Update the in-memory registry
        self.instances[(app_name, task_name, instance_name)] = config
        
        # Save back to file
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=4)

    def save_scenarios_list(self, filepath: str):
        """Save the list of scenarios and instances to a JSON file, grouped by app and scenario."""
        data = {
            "apps": {}
        }

        # Group scenarios by app
        for (app_name, task_name), scenario_cls in self.registry.items():
            if app_name not in data["apps"]:
                data["apps"][app_name] = []
            # Find instances for this scenario
            scenario_instances = []
            for (i_app, i_task, instance_name), config in self.instances.items():
                if i_app == app_name and i_task == task_name:
                    scenario_instances.append({
                        "instance_name": instance_name,
                        "config": config
                    })
            # Add scenario entry
            data["apps"][app_name].append({
                "task_name": task_name,
                "scenario_class": scenario_cls.__name__,
                "module": scenario_cls.__module__,
                "instances": scenario_instances
            })

        # Write to file
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        logger.info(f"Scenarios list saved to {filepath}")

# Global registry instance
scenario_registry = ScenarioRegistry()

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Configuration loading utilities for scenarios."""

import json
import inspect
import os
import random
import re
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class ConfigLoader:
    """Handles loading and validation of scenario configurations."""
    
    def __init__(self, scenario_instance):
        """
        Initialize the config loader.
        
        Args:
            scenario_instance: The scenario instance to load configs for
        """
        self.scenario = scenario_instance
        
    def load_all_configs(self):
        """Load all configuration files and set attributes on scenario instance."""
        current_file = inspect.getfile(self.scenario.__class__)
        scenario_dir = Path(current_file).parent
        
        # Load configs in order
        self._load_app_config(scenario_dir)
        self._load_scenario_config(scenario_dir)
        self._load_instance_configs(scenario_dir, self.scenario.instance_tag)
        
        # Resolve task description after all configs are loaded
        self._resolve_task_description()

    def _load_app_config(self, scenario_dir: Path):
        """Load app configuration from app_config.json in the app directory."""
        app_dir = scenario_dir.parent
        app_config_path = app_dir / "app_config.json"
        
        if app_config_path.exists():
            with open(app_config_path) as f:
                app_config = json.load(f)
                self.scenario.app_config = app_config
                for key, value in app_config.items():
                    setattr(self.scenario, key, value)
        else:
            self.scenario.app_config = {}

    def _load_scenario_config(self, scenario_dir: Path):
        """Load scenario configuration from scenario_config.json."""
        scenario_config_path = scenario_dir / "scenario_config.json"
        if scenario_config_path.exists():
            with open(scenario_config_path) as f:
                scenario_config = json.load(f)
                self.scenario.scenario_config = scenario_config
                for key, value in scenario_config.items():
                    setattr(self.scenario, key, value)
                
                # Validate context_fields if specified
                self._validate_context_fields()
        else:
            self.scenario.scenario_config = {}

    def _load_instance_configs(self, scenario_dir: Path, instance_tag: Optional[str]):
        """Load instance configuration based on instance_tag, or handle no instances case."""
        instances_dir = scenario_dir / "instances"
        
        # Initialize instance configs dict
        self.scenario.instance_configs = {}
        
        # If no instances directory exists, this is a task without instances
        if not instances_dir.exists():
            if instance_tag:
                raise ValueError(
                    f"Scenario does not support instances (no instances directory found), "
                    f"but instance_tag '{instance_tag}' was provided.\n"
                    f"Please create the scenario without an instance_tag."
                )
            self._set_default_config()
            return
        
        # If instances directory exists and no instance_tag was given,
        # auto-select based on DIGIWORLD_RANDOMIZE_INSTANCE:
        #   - false (default): pick the first instance deterministically
        #   - true: pick a random instance
        if not instance_tag:
            available_instances = sorted(
                d.name for d in instances_dir.iterdir() if d.is_dir()
            )
            if not available_instances:
                raise ValueError(
                    f"Scenario has an instances directory but it is empty.\n"
                    f"Either add instances or remove the instances directory."
                )

            randomize = os.environ.get(
                "DIGIWORLD_RANDOMIZE_INSTANCE", ""
            ).lower() in ("true", "1", "yes")

            if randomize:
                instance_tag = random.choice(available_instances)
                logger.info(
                    "DIGIWORLD_RANDOMIZE_INSTANCE: randomly selected instance '%s'",
                    instance_tag,
                )
            else:
                instance_tag = available_instances[0]
                logger.info(
                    "No instance_tag provided; deterministically selecting first instance '%s'",
                    instance_tag,
                )
            self.scenario.instance_tag = instance_tag
        
        # instance_tag is specified - try to load it
        available_instances = [d.name for d in instances_dir.iterdir() if d.is_dir()]
        instance_dir = instances_dir / instance_tag
        
        if instance_dir.is_dir():
            instance_config_path = instance_dir / "instance_config.json"
            if instance_config_path.exists():
                with open(instance_config_path) as f:
                    instance_config = json.load(f)
                    self.scenario.instance_configs[instance_tag] = instance_config
                    self._apply_instance_config(instance_config)
                    return
        
        # If specified instance not found, raise an error
        raise ValueError(
            f"Instance '{instance_tag}' not found in {instances_dir}.\n"
            f"Available instances: {available_instances if available_instances else 'None (directory is empty)'}"
        )

    def _apply_instance_config(self, instance_config: Dict):
        """Apply instance configuration to the scenario."""
        # Compatible profiles: instance overrides scenario-level if present
        if 'compatible_profiles' in instance_config:
            self.scenario.compatible_profiles = instance_config['compatible_profiles']
        # Otherwise keep scenario-level compatible_profiles (already loaded from scenario_config.json)
        
        self.scenario.target_trajectory_ids = instance_config.get('target_trajectory_ids', [])
        self.scenario.metadata = instance_config.get('metadata', {})
        self.scenario.additional_mockdata = instance_config.get('additional_mockdata', False)
        
        # Store raw templated context for later resolution at reset time
        self.scenario.raw_scenario_context = instance_config.get('scenario_context', {})
        
        # Validate that context_fields cover scenario_context template requirements
        self._validate_context_template_requirements()
        
        # Load parameters as individual fields on the class
        parameters = instance_config.get('parameters', {})
        resolved_parameters = {}
        for param_name, param_value in parameters.items():
            resolved_parameters[param_name] = self._resolve_date_templates(param_value)
            setattr(self.scenario, param_name, resolved_parameters[param_name])
        
        # Store parameters dict as well for reference
        self.scenario.parameters = resolved_parameters

    @staticmethod
    def _resolve_date_templates(value):
        """Resolve {{tomorrow_date}} style templates in parameter values."""
        if not isinstance(value, str) or "{{" not in value:
            return value
        now = datetime.utcnow()
        replacements = {
            "{{tomorrow_date_plus7}}": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
            "{{tomorrow_date_plus1}}": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
            "{{tomorrow_date}}": now.strftime("%Y-%m-%d"),
        }
        result = value
        for tag, resolved in replacements.items():
            result = result.replace(tag, resolved)
        return result

    def _validate_context_fields(self):
        """Validate the context_fields specification in scenario config."""
        context_fields = self.scenario.scenario_config.get('context_fields')
        
        if context_fields is None:
            return
        
        if not isinstance(context_fields, list):
            raise ValueError(f"context_fields must be a list, got {type(context_fields)}")
        
        # Get supported fields from this scenario type
        supported_fields = self.scenario._get_supported_context_fields()
        
        # Validate each field is supported
        unsupported_fields = []
        for field in context_fields:
            if field not in supported_fields:
                unsupported_fields.append(field)
        
        if unsupported_fields:
            raise ValueError(
                f"Unsupported context fields for {self.scenario.__class__.__name__}: {unsupported_fields}. "
                f"Supported fields: {list(supported_fields.keys())}"
            )
        
        logger.info(f"Validated context_fields: {context_fields}")

    def _validate_context_template_requirements(self):
        """Validate that scenario_context templates use declared context fields."""
        if not self.scenario.raw_scenario_context:
            return
        
        # Extract template placeholders from scenario context
        required_fields = self._extract_template_placeholders(self.scenario.raw_scenario_context)
        
        if not required_fields:
            return
        
        # Get declared context fields
        declared_fields = set(self.scenario.scenario_config.get('context_fields', []))
        
        # Check for missing context fields
        missing_fields = required_fields - declared_fields
        
        if missing_fields:
            raise ValueError(
                f"Instance scenario_context uses templates that require context fields not declared in scenario config.\n"
                f"Missing context_fields: {sorted(missing_fields)}\n"
                f"Declared context_fields: {sorted(declared_fields)}\n"
                f"Required by templates: {sorted(required_fields)}\n"
                f"Please add missing fields to context_fields in scenario_config.json"
            )
        
        logger.info(f"Validated scenario_context templates match declared context_fields: {sorted(required_fields)}")

    def _extract_template_placeholders(self, obj, placeholders=None):
        """Recursively extract template placeholders from nested objects."""
        if placeholders is None:
            placeholders = set()
        
        if isinstance(obj, str):
            templates = re.findall(r'\{\{([^}]+)\}\}', obj)
            placeholders.update(templates)
        elif isinstance(obj, dict):
            for value in obj.values():
                self._extract_template_placeholders(value, placeholders)
        elif isinstance(obj, list):
            for item in obj:
                self._extract_template_placeholders(item, placeholders)
        
        return placeholders

    def _set_default_config(self):
        """Set default configuration values for instance-level configs when no instances exist."""
        # Only set defaults for instance-level configs, preserve scenario-level configs already loaded
        # Don't override compatible_profiles if it was set from scenario_config.json
        if not hasattr(self.scenario, 'compatible_profiles'):
            self.scenario.compatible_profiles = []
        
        self.scenario.target_trajectory_ids = []
        self.scenario.metadata = {}
        self.scenario.additional_mockdata = False
        self.scenario.parameters = {}
        self.scenario.instance_configs = {}
        self.scenario.raw_scenario_context = {}

    def _resolve_task_description(self):
        """Resolve the task description template with instance parameters."""
        task_template = self.scenario.scenario_config.get('task_name', '')
        
        if not task_template:
            self.scenario.task_description = "No task description available"
            return
        
        # Replace <parameter> placeholders with actual values
        resolved_description = task_template
        for param_name, param_value in getattr(self.scenario, 'parameters', {}).items():
            placeholder = f'<{param_name}>'
            resolved_description = resolved_description.replace(placeholder, str(param_value))
        
        # Check for unresolved placeholders
        unresolved = re.findall(r'<([^>]+)>', resolved_description)
        if unresolved:
            logger.warning(f"Unresolved parameters in task description: {unresolved}")
        
        self.scenario.task_description = resolved_description


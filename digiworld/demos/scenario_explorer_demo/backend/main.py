# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Scenario Explorer Demo - Backend API
A comprehensive, game-like interface for exploring scenarios and the scenario framework
"""

import os
import sys
import inspect
import random
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import digiworld
from digiworld.app_registry import (
    get_app_to_bundle_mapping,
    get_display_names,
    get_icons,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from digiworld.scenarios.scenario_registry import scenario_registry
import digiworld.scenarios.scenarios

app = FastAPI(title="Scenario Explorer Demo API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# App metadata from centralized registry
APP_BUNDLES = get_app_to_bundle_mapping()
APP_ICONS = get_icons()
APP_NAMES = get_display_names()


class ScenarioExplorerManager:
    """Manages the scenario explorer demo workflow"""
    
    def __init__(self):
        self.current_scenario = None
        self.current_instance = None
        self.scenario_object = None
        
        # Get state_data path from digiworld package
        self.base_path = digiworld.get_state_data_path()
        print(f"Using state_data path: {self.base_path}")

    def _scenario_uses_answer(self) -> bool:
        """Check if the current scenario actually uses agent_answer in its verification.

        ``agent_answer`` is a class attribute on every ``ComposableScenario``,
        so ``hasattr`` alone is not enough.  Instead, inspect the concrete
        ``_get_checks`` source to see if it references ``agent_answer``.
        """
        if not self.scenario_object:
            return False
        if not hasattr(self.scenario_object, "agent_answer"):
            return False
        try:
            source = inspect.getsource(self.scenario_object._get_checks)
            return "agent_answer" in source
        except (TypeError, OSError):
            return False

    def get_all_scenarios(self, app_filter: Optional[str] = None, 
                         difficulty_filter: Optional[str] = None,
                         validation_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all scenarios with filtering options"""
        scenarios = []
        
        # Get all available instances
        for app_name, task_name, instance_name in scenario_registry.get_instance_list():
            try:
                # Get instance config
                config = scenario_registry.get_instance_config(app_name, task_name, instance_name)
                
                # Get scenario class info
                scenario_class = scenario_registry.registry.get((app_name, task_name))
                
                # Apply filters
                if app_filter and app_name != app_filter:
                    continue
                    
                difficulty = config.get('metadata', {}).get('difficulty', 'unknown')
                if difficulty_filter and difficulty != difficulty_filter:
                    continue
                
                validation = config.get('validation', {})
                is_validated = validation.get('validated', False)
                
                if validation_filter == 'validated' and not is_validated:
                    continue
                elif validation_filter == 'not_validated' and is_validated:
                    continue
                
                # Build scenario info
                scenario_info = {
                    "id": f"{app_name}_{task_name}_{instance_name}",
                    "app_name": app_name,
                    "app_display_name": APP_NAMES.get(app_name, app_name),
                    "app_icon": APP_ICONS.get(app_name, "📱"),
                    "task_name": task_name,
                    "instance_name": instance_name,
                    "bundle_id": APP_BUNDLES.get(app_name, ""),
                    "parameters": config.get('parameters', {}),
                    "difficulty": difficulty,
                    "compatible_profiles": config.get('compatible_profiles', []),
                    "has_additional_mockdata": config.get('additional_mockdata', False),
                    "validated": is_validated,
                    "validation": {
                        "validated": is_validated,
                        "last_validated": validation.get('last_validated', ''),
                        "validated_by": validation.get('validated_by', ''),
                        "notes": validation.get('validation_notes', '')
                    },
                    "metadata": config.get('metadata', {})
                }
                
                scenarios.append(scenario_info)
                
            except Exception as e:
                print(f"Error processing scenario {app_name}/{task_name}/{instance_name}: {e}")
                continue
        
        return scenarios
    
    def get_scenarios_without_instances(self) -> List[Dict[str, Any]]:
        """Get scenarios that don't have instances"""
        scenarios = []
        
        # Get all scenarios
        for app_name, task_name in scenario_registry.get_scenario_list():
            # Check if this scenario has instances
            has_instances = any(
                app == app_name and task == task_name
                for app, task, _ in scenario_registry.get_instance_list()
            )
            
            if not has_instances:
                # Read compatible_profiles from the scenario config
                scenario_config = scenario_registry.scenario_configs.get((app_name, task_name), {})
                scenario_info = {
                    "id": f"{app_name}_{task_name}_no_instance",
                    "app_name": app_name,
                    "app_display_name": APP_NAMES.get(app_name, app_name),
                    "app_icon": APP_ICONS.get(app_name, "📱"),
                    "task_name": task_name,
                    "instance_name": None,
                    "bundle_id": APP_BUNDLES.get(app_name, ""),
                    "parameters": {},
                    "difficulty": "unknown",
                    "compatible_profiles": scenario_config.get('compatible_profiles', []),
                    "has_additional_mockdata": False,
                    "validated": False,
                    "validation": {},
                    "metadata": {}
                }
                scenarios.append(scenario_info)
        
        return scenarios
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about scenarios"""
        all_scenarios = self.get_all_scenarios()
        no_instance_scenarios = self.get_scenarios_without_instances()
        
        # Count by app (including scenarios without instances)
        by_app = {}
        for scenario in all_scenarios:
            app = scenario['app_name']
            by_app[app] = by_app.get(app, 0) + 1
        
        # Also count scenarios without instances
        for scenario in no_instance_scenarios:
            app = scenario['app_name']
            by_app[app] = by_app.get(app, 0) + 1
        
        # Count by difficulty
        by_difficulty = {}
        for scenario in all_scenarios:
            diff = scenario['difficulty']
            by_difficulty[diff] = by_difficulty.get(diff, 0) + 1
        
        # Count validated
        validated_count = sum(1 for s in all_scenarios if s['validated'])
        
        # Build app metadata from registry
        app_metadata = {
            app_name: {
                "name": APP_NAMES.get(app_name, app_name),
                "icon": APP_ICONS.get(app_name, "📱"),
                "bundle_id": APP_BUNDLES.get(app_name, ""),
            }
            for app_name in APP_NAMES.keys()
        }
        
        return {
            "total_scenarios": len(all_scenarios),
            "scenarios_without_instances": len(no_instance_scenarios),
            "validated": validated_count,
            "not_validated": len(all_scenarios) - validated_count,
            "by_app": by_app,
            "by_difficulty": by_difficulty,
            "apps": list(APP_NAMES.keys()),
            "app_metadata": app_metadata
        }
    
    def select_scenario(self, scenario_id: str) -> Dict[str, Any]:
        """Select a scenario for interaction"""
        # Parse scenario ID
        parts = scenario_id.split('_', 2)
        if len(parts) < 3:
            raise HTTPException(status_code=400, detail="Invalid scenario ID")
        
        app_name = parts[0]
        # Reconstruct task_name and instance_name
        remaining = '_'.join(parts[1:])
        
        # Find the matching scenario
        all_scenarios = self.get_all_scenarios()
        no_instance_scenarios = self.get_scenarios_without_instances()
        
        scenario = None
        for s in all_scenarios + no_instance_scenarios:
            if s['id'] == scenario_id:
                scenario = s
                break
        
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        self.current_scenario = scenario
        self.current_instance = scenario.get('instance_name')
        
        # Get the scenario class
        scenario_class = scenario_registry.registry.get(
            (scenario['app_name'], scenario['task_name'])
        )
        
        if not scenario_class:
            raise HTTPException(status_code=404, detail="Scenario class not found")
        
        # Create scenario object (ADB + environment setup happens in reset_initial_state)
        instance_tag = scenario['instance_name']
        self.scenario_object = scenario_class(self.base_path, instance_tag)
        
        uses_answer = self._scenario_uses_answer()

        return {
            "success": True,
            "scenario": scenario,
            "uses_answer": uses_answer,
            "message": f"Selected scenario: {scenario['task_name']} ({scenario['instance_name'] or 'no instance'})"
        }
    
    def reset_scenario(
        self,
        profile: Optional[str] = None,
        theme: Optional[str] = None,
        ui_state: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Reset the scenario to initial state.

        The three dimensions (profile, theme, UI state) are resolved
        independently at runtime — no variant directories needed.
        """
        try:
            if not self.scenario_object:
                raise HTTPException(status_code=400, detail="Please select a scenario first")

            with open('/tmp/reset_debug.log', 'a') as f:
                f.write(f"\n{'='*60}\n")
                f.write(f"RESET CALLED at {__import__('datetime').datetime.now()}\n")
                f.write(f"Scenario: {self.scenario_object.__class__.__name__}\n")
                f.write(f"Instance tag: {getattr(self.scenario_object, 'instance_tag', 'None')}\n")
                f.write(f"Profile: {profile}, Theme: {theme}, UI state: {ui_state}\n")

            logger.info(f"Resetting scenario: {self.scenario_object.__class__.__name__}")
            logger.info(f"Profile={profile}, Theme={theme}, UI state={ui_state}")

            # If a specific base profile was requested, temporarily
            # override compatible_profiles so reset_initial_state() picks it.
            original_profiles = None
            if profile:
                original_profiles = getattr(self.scenario_object, 'compatible_profiles', None)
                self.scenario_object.compatible_profiles = [profile]

            try:
                # Pass theme and ui_state as runtime overrides —
                # no variant directory lookup needed.
                self.scenario_object.reset_initial_state(
                    theme=theme if theme and theme != "default" else None,
                    ui_state=ui_state if ui_state and ui_state != "default" else None,
                )
            finally:
                if original_profiles is not None:
                    self.scenario_object.compatible_profiles = original_profiles
            
            with open('/tmp/reset_debug.log', 'a') as f:
                f.write(f"Reset complete. Initial state path: {self.scenario_object.initial_state_path}\n")
            
            logger.info(f"Reset complete. Initial state path: {self.scenario_object.initial_state_path}")
        except Exception as e:
            import traceback
            error_msg = f"ERROR in reset_scenario:\n{traceback.format_exc()}"
            logger.error(error_msg)
            with open('/tmp/reset_debug.log', 'a') as f:
                f.write(f"\n{error_msg}\n")
            raise HTTPException(status_code=500, detail=str(e))
        
        # Get task description
        task_description = self.scenario_object.get_task_description()
        
        # Get context if available
        context_info = f"=== TASK DESCRIPTION ===\n{task_description}\n\n"
        
        if hasattr(self.scenario_object, 'format_context_for_system_prompt'):
            db_path = None
            if hasattr(self.scenario_object, 'initial_state_path') and self.scenario_object.initial_state_path:
                db_path = os.path.join(
                    self.scenario_object.initial_state_path,
                    f"{self.scenario_object.initial_state_id}.db"
                )
            
            context = self.scenario_object.format_context_for_system_prompt(db_path)
            context_info += f"=== AGENT CONTEXT ===\n{context}"
        
        profile_name = getattr(self.scenario_object, 'profile_name', 'unknown')
        initial_state_path = getattr(self.scenario_object, 'initial_state_path', '')
        initial_state_id = getattr(self.scenario_object, 'initial_state_id', '')

        return {
            "success": True,
            "context": context_info,
            "profile": profile_name,
            "initial_state_path": initial_state_path,
            "initial_state_id": initial_state_id,
            "message": f"App reset to profile '{profile_name}'. Perform the task on the emulator."
        }
    
    def load_assets(
        self,
        profile: Optional[str] = None,
        force: bool = False,
        method: str = "parallel",
        workers: int = 5,
    ) -> Dict[str, Any]:
        """Push multimedia assets/ to the device for the given profile."""
        if not self.scenario_object:
            raise HTTPException(status_code=400, detail="Please select a scenario first")
        ok = self.scenario_object.load_app_assets(
            profile=profile, force=force, method=method, workers=workers
        )
        method_label = f"parallel ({workers}w)" if method == "parallel" else method
        return {
            "success": ok,
            "profile": profile or getattr(self.scenario_object, "profile_name", "default"),
            "method": method_label,
            "message": f"Assets pushed [{method_label}]." if ok else "Asset push failed — check logs.",
        }

    def verify_task(self, agent_answer: Optional[str] = None) -> Dict[str, Any]:
        """Verify if the task was completed using the same code path as the evaluation pipeline."""
        if not self.scenario_object:
            raise HTTPException(status_code=400, detail="Please select a scenario first")
        
        if agent_answer is not None and hasattr(self.scenario_object, "agent_answer"):
            self.scenario_object.agent_answer = agent_answer

        session_id = self.scenario_object.adb.persist_state()

        trajectory = [self.scenario_object.initial_state_id, session_id]
        metrics = self.scenario_object.verify_trajectory(trajectory)

        task_completed = metrics.get("task_completed", 0.0)
        completed = task_completed == 1.0

        uses_answer = self._scenario_uses_answer()

        return {
            "success": True,
            "completed": completed,
            "metrics": metrics,
            "uses_answer": uses_answer,
            "message": "Task completed successfully!" if completed else "Task not completed yet."
        }
    
    def get_scenario_details(self, scenario_id: str) -> Dict[str, Any]:
        """Get detailed information about a scenario including verifier logic"""
        # Find the scenario
        all_scenarios = self.get_all_scenarios()
        no_instance_scenarios = self.get_scenarios_without_instances()
        
        scenario = None
        for s in all_scenarios + no_instance_scenarios:
            if s['id'] == scenario_id:
                scenario = s
                break
        
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        # Get the scenario class
        scenario_class = scenario_registry.registry.get(
            (scenario['app_name'], scenario['task_name'])
        )
        
        if not scenario_class:
            return {
                **scenario,
                "verifier_info": "Verifier class not found",
                "class_name": "Unknown"
            }
        
        # Get verifier information
        class_name = scenario_class.__name__
        class_file = None
        class_doc = scenario_class.__doc__ or "No documentation available"
        
        try:
            class_file = os.path.relpath(sys.modules[scenario_class.__module__].__file__)
        except Exception:
            class_file = "Unknown"
        
        verifier_logic = "Source code not available"
        try:
            import inspect
            if hasattr(scenario_class, '_get_checks'):
                method = getattr(scenario_class, '_get_checks')
                verifier_logic = inspect.getsource(method)
            elif hasattr(scenario_class, '_check_task_completion'):
                method = getattr(scenario_class, '_check_task_completion')
                verifier_logic = inspect.getsource(method)
        except Exception as e:
            verifier_logic = f"Could not retrieve source: {str(e)}"
        
        return {
            **scenario,
            "verifier_info": {
                "class_name": class_name,
                "class_file": class_file,
                "documentation": class_doc.strip(),
                "logic": verifier_logic
            }
        }


# Initialize manager
manager = ScenarioExplorerManager()


# API Models
class SelectScenarioRequest(BaseModel):
    scenario_id: str


class FilterRequest(BaseModel):
    app: Optional[str] = None
    difficulty: Optional[str] = None
    validation: Optional[str] = None


class ResetRequest(BaseModel):
    profile: Optional[str] = None
    theme: Optional[str] = None
    ui_state: Optional[str] = None


class VerifyTaskRequest(BaseModel):
    agent_answer: Optional[str] = None


class LoadAssetsRequest(BaseModel):
    profile: Optional[str] = None
    force: bool = False
    method: str = "auto"       # "auto" | "parallel" | "zip"
    workers: int = 5           # parallel only; 5 recommended (see asset_transfer_guide.md)


# API Endpoints
@app.get("/api/scenarios")
async def get_scenarios(
    app: Optional[str] = None,
    difficulty: Optional[str] = None,
    validation: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get all scenarios with optional filtering"""
    return manager.get_all_scenarios(app, difficulty, validation)


@app.get("/api/scenarios/without-instances")
async def get_scenarios_without_instances() -> List[Dict[str, Any]]:
    """Get scenarios that don't have instances"""
    return manager.get_scenarios_without_instances()


@app.get("/api/stats")
async def get_stats() -> Dict[str, Any]:
    """Get statistics about scenarios"""
    return manager.get_stats()


@app.get("/api/scenario/random")
async def get_random_scenario(
    app: Optional[str] = None,
    difficulty: Optional[str] = None,
    validated_only: bool = False
) -> Dict[str, Any]:
    """Get a random scenario with optional filters"""
    validation_filter = 'validated' if validated_only else None
    scenarios = manager.get_all_scenarios(app, difficulty, validation_filter)
    
    if not scenarios:
        raise HTTPException(status_code=404, detail="No scenarios match the criteria")
    
    random_scenario = random.choice(scenarios)
    return random_scenario


@app.post("/api/scenario/select")
async def select_scenario(request: SelectScenarioRequest) -> Dict[str, Any]:
    """Select a scenario for interaction"""
    return manager.select_scenario(request.scenario_id)


@app.post("/api/scenario/reset")
async def reset_scenario(request: ResetRequest = ResetRequest()) -> Dict[str, Any]:
    """Reset the scenario to initial state"""
    return manager.reset_scenario(
        profile=request.profile,
        theme=request.theme,
        ui_state=request.ui_state,
    )


@app.post("/api/scenario/load-assets")
async def load_assets(request: LoadAssetsRequest = LoadAssetsRequest()) -> Dict[str, Any]:
    """Push multimedia assets to device (images, videos).  Call once at emulator startup."""
    return manager.load_assets(
        profile=request.profile,
        force=request.force,
        method=request.method,
        workers=request.workers,
    )


@app.post("/api/scenario/verify")
async def verify_task(request: VerifyTaskRequest = VerifyTaskRequest()) -> Dict[str, Any]:
    """Verify task completion"""
    return manager.verify_task(agent_answer=request.agent_answer)


# Wildcard route MUST come after all fixed /api/scenario/* routes
@app.get("/api/scenario/{scenario_id}")
async def get_scenario_details(scenario_id: str) -> Dict[str, Any]:
    """Get detailed information about a specific scenario"""
    return manager.get_scenario_details(scenario_id)


@app.get("/api/themes/{app_name}")
async def get_themes(app_name: str) -> List[Dict[str, Any]]:
    """Get available themes for an app"""
    bundle_id = APP_BUNDLES.get(app_name, "")
    themes_dir = os.path.join(manager.base_path, bundle_id, ".themes")
    themes: List[Dict[str, Any]] = [
        {"id": "default", "name": "Default (profile theme)"},
    ]
    if os.path.isdir(themes_dir):
        for f in sorted(os.listdir(themes_dir)):
            if f.endswith(".json") and not f.startswith("_"):
                theme_key = f[:-5]  # strip .json
                themes.append({"id": theme_key, "name": theme_key.replace("-", " ").title()})
    return themes


@app.get("/api/ui-states/{app_name}")
async def get_ui_states(app_name: str) -> List[Dict[str, Any]]:
    """Get available non-data-dependent UI states for an app"""
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "digiworld", "scenarios", "scenarios", app_name, "state_enumeration.json",
    )
    if not os.path.exists(config_path):
        return [{"id": "default", "route": "", "description": "Home (default)", "screen_name": "home"}]

    import json as _json
    with open(config_path) as f:
        config = _json.load(f)

    home_route = config.get("home_route", "")
    route_map = {route["id"]: route for route in config.get("routes", [])}
    states: List[Dict[str, Any]] = [
        {"id": "default", "route": home_route, "description": "Home (default)", "screen_name": "home"},
    ]

    # Prefer generated UI-state summaries when available so the explorer can
    # expose each concrete variant (for example, inbox_var0..inbox_var8).
    bundle_id = get_app_to_bundle_mapping().get(app_name, f"com.andojo{app_name}.sbx")
    summary_path = os.path.join(
        str(digiworld.get_state_data_path()).rstrip("/"),
        bundle_id,
        ".ui_states",
        "default",
        "_state_summary.json",
    )
    if os.path.exists(summary_path):
        with open(summary_path) as f:
            summary = _json.load(f)

        for entry in summary:
            state_id = os.path.splitext(entry["filename"])[0]
            route_id = entry.get("route_id")
            route_meta = route_map.get(route_id, {})
            description = route_meta.get("description", route_id or state_id)
            context = entry.get("context") or {}
            if context:
                context_str = ", ".join(f"{key}={value}" for key, value in context.items())
                description = f"{description} ({context_str})"

            states.append({
                "id": state_id,
                "route": entry.get("route", ""),
                "description": description,
                "screen_name": entry.get("screen_name", route_meta.get("screen_name", state_id)),
            })
        return states

    for route in config.get("routes", []):
        if route.get("dynamic"):
            continue
        # Skip the home route (already included as "default")
        if route.get("route") == home_route:
            continue
        states.append({
            "id": route["id"],
            "route": route["route"],
            "description": route.get("description", route["id"]),
            "screen_name": route.get("screen_name", route["id"]),
        })
    return states


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    print("Starting Scenario Explorer Demo API...")
    print("API will be available at: http://localhost:8000")
    print("API docs at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Server-based Environment for DigiWorld evaluation.

Talks to benchmark servers via HTTP:
  - /session/reset, /session/verify
  - /device/command, /device/screenshot, /device/resolution
"""

import os
import threading
import time
import uuid
from collections.abc import Callable
from logging import getLogger
from typing import Any

import requests
from PIL import Image

from digiworld_eval.lib.core.action_spaces import CUA_ACTION_SPACE
from digiworld_eval.lib.core.actions import ActionSpace, ActionType, CoordinateSystem, ParsedAction
from digiworld_eval.lib import env_api
from digiworld_eval.lib.env_api import DialogEnv as _DialogEnvBase
from digiworld_eval.lib import env_config as config

from digiworld_eval.env.prompts import USER_PROMPT_TEMPLATE
from digiworld_eval.env.provisioners import ContainerProvisioner
from digiworld_eval.env.server_commands import ServerCommands
from digiworld_eval.env.types import ServerState
from digiworld_eval.env.utils.image import (
    concat_trajectory_images,
    draw_action_image_only,
)

logger = getLogger(__name__)

POST_ACTION_SLEEP_SECONDS: float = 1.0
DEFAULT_GOAL_TEMPLATE = "{goal}"

_VM_UNHEALTHY_THRESHOLD: int = 2
_VM_UNHEALTHY_BACKOFF_BASE: float = 30.0
_VM_UNHEALTHY_BACKOFF_CAP: float = 600.0

# ADB command constants
_SWIPE_DURATION_MS: int = 300
_LONG_PRESS_DURATION_MS: int = 500
_SCROLL_DISTANCE: float = 0.3


# ---------------------------------------------------------------------------
# ADB action execution
# ---------------------------------------------------------------------------


def _to_adb_command(
    action: ParsedAction, emulator_resolution: tuple[int, int]
) -> str | None:
    params = action.params
    at = action.action_type

    if at == ActionType.TAP:
        return f"input tap {params['x']} {params['y']}"
    if at == ActionType.LONG_PRESS:
        x, y = params["x"], params["y"]
        return f"input swipe {x} {y} {x} {y} {_LONG_PRESS_DURATION_MS}"
    if at == ActionType.SWIPE:
        return (
            f"input swipe {params['x1']} {params['y1']} "
            f"{params['x2']} {params['y2']} {_SWIPE_DURATION_MS}"
        )
    if at == ActionType.TYPE:
        return f'input text "{params["text"]}"'
    if at == ActionType.SCROLL:
        w, h = emulator_resolution
        cx, cy = int(w * 0.5), int(h * 0.5)
        dx, dy = int(w * _SCROLL_DISTANCE), int(h * _SCROLL_DISTANCE)
        d = params["direction"]
        if d == "down":
            return f"input swipe {cx} {cy+dy} {cx} {cy-dy} {_SWIPE_DURATION_MS}"
        if d == "up":
            return f"input swipe {cx} {cy-dy} {cx} {cy+dy} {_SWIPE_DURATION_MS}"
        if d == "left":
            return f"input swipe {cx+dx} {cy} {cx-dx} {cy} {_SWIPE_DURATION_MS}"
        if d == "right":
            return f"input swipe {cx-dx} {cy} {cx+dx} {cy} {_SWIPE_DURATION_MS}"
        raise ValueError(f"Unsupported scroll direction {d!r}")
    if at == ActionType.NAVIGATE:
        keyevents = {"back": "4", "home": "3", "enter": "66"}
        code = keyevents.get(params["option"])
        if code:
            return f"input keyevent {code}"
        raise ValueError(f"Unsupported navigate option {params['option']!r}")
    if at in (ActionType.STATUS, ActionType.ANSWER):
        return None

    raise ValueError(f"Unhandled action type {at!r}")


# ---------------------------------------------------------------------------
# Goal building
# ---------------------------------------------------------------------------


def _build_goal(
    task_description: str,
    context: str,
    task_id: str,
    episode_args: dict,
    goal_template: str,
) -> str:
    goal_parts = [task_description]
    if (
        context
        and context != "No specific context information available for this scenario."
    ):
        goal_parts.append(f"\n\nContext information:\n{context}")
    base_goal = "".join(goal_parts)

    if "{app_name}" in goal_template:
        app_name = episode_args.get("app_name") or task_id.split("__", 1)[0]
        return goal_template.format(app_name=app_name, goal=base_goal)
    return goal_template.format(goal=base_goal)


# ---------------------------------------------------------------------------
# ServerEnv
# ---------------------------------------------------------------------------


class ServerEnv(_DialogEnvBase):
    """Environment backed by HTTP benchmark servers."""

    def __init__(
        self,
        media_transform: Callable | None = None,
        media_placeholder_tag: str = "",
        add_system_prefix: bool = True,
        server_file: str | None = None,
        server_urls: list[str] | None = None,
        container_image: str | None = None,
        container_count: int | None = None,
        container_runtime: str | None = None,
        container_extra_args: list[str] | None = None,
        container_env: dict[str, str] | None = None,
        container_device_kvm: bool = True,
        goal_template: str = DEFAULT_GOAL_TEMPLATE,
        max_turns: int = 20,
        max_single_action_len: int = 512,
        saved_screenshot_folder: str = "saved_emulator_screenshot",
        save_trajectories: bool = True,
        # Must outlast the server's own reset budget (DIGIWORLD_RESET_BUDGET,
        # 240s), which covers up to three relaunch-and-retry attempts. Timing
        # out below it abandons a reset that is still running and would have
        # succeeded, and reports a read timeout instead of the real failure.
        session_timeout: int = 300,
        think: bool = False,
        action_space: ActionSpace = CUA_ACTION_SPACE,
        prompt_template: str = USER_PROMPT_TEMPLATE,
        history_fn: Callable | None = None,
    ) -> None:
        assert not think, "Currently not supporting think"
        self.think = think
        self.max_turns = max_turns
        self.max_single_action_len = max_single_action_len
        self.saved_screenshot_folder = saved_screenshot_folder
        self._save_trajectories = save_trajectories
        self._session_timeout = session_timeout
        self._goal_template = goal_template
        self._provisioner: ContainerProvisioner | None = None

        if container_image is not None:
            self._provisioner = ContainerProvisioner(
                image=container_image,
                runtime=container_runtime,
                container_env=container_env,
                extra_args=container_extra_args,
                device_kvm=container_device_kvm,
            )
            # One container == one Android emulator, so the default is
            # deliberately conservative: each one wants a CPU core or two and
            # several GB of RAM.
            count = container_count if container_count is not None else int(os.environ.get("WORLD_SIZE", 1))
            logger.info(
                "Auto-provisioning %d %s containers...", count, self._provisioner.runtime
            )
            self.server_urls = self._provisioner.provision(count)
            logger.info("Provisioned %d servers: %s", len(self.server_urls), self.server_urls)
        elif server_file is not None:
            with open(server_file) as f:
                self.server_urls = [line.strip() for line in f if line.strip()]
        elif server_urls is not None:
            self.server_urls = server_urls
        else:
            raise ValueError(
                "One of container_image, server_file, or server_urls must be provided"
            )

        self.server_commands = ServerCommands()
        self.action_space = action_space
        # Constant for the env's lifetime; compute once instead of every step.
        self._action_descriptions = action_space.get_prompt_description(
            CoordinateSystem.NORMALIZED_01
        )
        self._prompt_template = prompt_template
        self._history_fn = history_fn

        self._validated_server_count = False
        if self._save_trajectories:
            os.makedirs(self.saved_screenshot_folder, exist_ok=True)

        self._health_lock = threading.Lock()
        self._failure_counts: dict[str, int] = {}
        self._unhealthy: set[str] = set()
        self._backoff_counts: dict[str, int] = {}
        self._shutdown_event = threading.Event()

        super().__init__(
            media_transform=media_transform,
            media_placeholder_tag=media_placeholder_tag,
            add_system_prefix=add_system_prefix,
        )

    @property
    def max_concurrent_episodes(self) -> int:
        return len(self.server_urls)

    def max_action_len(self, state: env_api.State) -> int:
        return self.max_single_action_len

    @staticmethod
    def _resolve_task_id(episode_args: dict) -> str:
        if "task_id" in episode_args:
            return episode_args["task_id"]
        if all(k in episode_args for k in ("app_name", "scenario_name", "instance")):
            return (
                f"{episode_args['app_name']}"
                f"__{episode_args['scenario_name']}"
                f"__{episode_args['instance']}"
            )
        raise ValueError(
            "episode_args must contain 'task_id' or "
            "('app_name', 'scenario_name', 'instance')"
        )

    def _record_server_failure(self, server_url: str) -> None:
        with self._health_lock:
            count = self._failure_counts.get(server_url, 0) + 1
            self._failure_counts[server_url] = count
            if count >= _VM_UNHEALTHY_THRESHOLD and server_url not in self._unhealthy:
                self._unhealthy.add(server_url)
                logger.error(
                    "VM %s marked unhealthy after %d consecutive failures",
                    server_url, count,
                )

    def _record_server_success(self, server_url: str) -> None:
        with self._health_lock:
            self._failure_counts.pop(server_url, None)

    def _check_vm_health(self, server_url: str, thread_idx: int) -> None:
        with self._health_lock:
            if server_url not in self._unhealthy:
                return
            n = self._backoff_counts.get(server_url, 0)
            self._backoff_counts[server_url] = n + 1

        penalty = min(_VM_UNHEALTHY_BACKOFF_BASE * (2**n), _VM_UNHEALTHY_BACKOFF_CAP)
        logger.warning(
            "VM %s is unhealthy (thread %d), sleeping %.0fs (attempt %d)",
            server_url, thread_idx, penalty, n + 1,
        )
        self._shutdown_event.wait(timeout=penalty)
        raise RuntimeError(f"VM {server_url} is unhealthy")

    def _execute_action(self, parsed: ParsedAction, state: ServerState) -> None:
        """Execute a parsed action via ADB commands on the server."""
        command = _to_adb_command(parsed, state.emulator_resolution)
        if command is not None:
            self.server_commands.send_command(state.ip_address, command)

    # ------------------------------------------------------------------
    # Episode lifecycle
    # ------------------------------------------------------------------

    def start(
        self, episode_args: dict | None = None,
    ) -> tuple[env_api.State, env_api.Transition]:
        assert episode_args is not None

        thread_idx: int = episode_args["thread_idx"]
        rank_idx: int = episode_args["rank_idx"]
        rollout_threads_per_rank: int = episode_args["rollout_threads_per_rank"]
        server_idx = rollout_threads_per_rank * rank_idx + thread_idx

        if not self._validated_server_count and rank_idx == 0 and thread_idx == 0:
            self._validated_server_count = True
            world_size = int(os.environ.get("WORLD_SIZE", 1))
            total_needed = world_size * rollout_threads_per_rank
            available = len(self.server_urls)
            if total_needed != available:
                logger.warning(
                    "Server count mismatch: %d available, %d needed (%d ranks x %d threads)",
                    available, total_needed, world_size, rollout_threads_per_rank,
                )

        server_url = self.server_urls[server_idx]
        self._check_vm_health(server_url, thread_idx)
        try:
            return self._start_episode(
                server_url, episode_args, thread_idx, rank_idx, rollout_threads_per_rank
            )
        except Exception:
            self._record_server_failure(server_url)
            raise

    def _start_episode(
        self,
        server_url: str,
        episode_args: dict,
        thread_idx: int,
        rank_idx: int,
        rollout_threads_per_rank: int,
    ) -> tuple[env_api.State, env_api.Transition]:
        screen_resolution = self.server_commands.get_emulator_resolution(server_url) or (0, 0)
        task_id = self._resolve_task_id(episode_args)

        logger.info("Resetting task %s on %s (rank=%d, thread=%d)", task_id, server_url, rank_idx, thread_idx)

        reset_response = requests.post(
            f"{server_url}/session/reset",
            json={"task_id": task_id},
            timeout=self._session_timeout,
        )
        reset_response.raise_for_status()
        self._record_server_success(server_url)
        reset_data = reset_response.json()

        task_description = reset_data["task_description"]
        context = reset_data.get("context", "")
        metadata = reset_data.get("metadata", {})

        agent_goal = _build_goal(task_description, context, task_id, episode_args, self._goal_template)

        state = ServerState(
            unique_id=uuid.uuid4().hex[:8],
            rank_idx=rank_idx,
            thread_idx=thread_idx,
            question=agent_goal,
            step_id=0,
            step_0_time=time.time(),
            ip_address=server_url,
            emulator_resolution=screen_resolution,
            past_actions=[],
            server_url=server_url,
            task_id=task_id,
            initial_state_id=metadata.get("initial_state_id", ""),
            instance=metadata.get("instance", ""),
            profile=metadata.get("profile", ""),
            theme=metadata.get("theme", ""),
            ui_state=metadata.get("ui_state", ""),
        )

        media = self.server_commands.get_screenshot(state)
        assert media is not None, "Failed to capture screenshot from server"

        cur_img_path = ""
        if self._save_trajectories:
            cur_img_path = (
                f"{self.saved_screenshot_folder}/rank_{rank_idx}_thread_{thread_idx}_"
                f"traj_{state.unique_id}_step_0.png"
            )
            media.save(cur_img_path)

        prompt_text = self._prompt_template.format(
            action_descriptions=self._action_descriptions,
            goal=state.question,
            past_actions=", ".join(state.past_actions),
        )
        prompt_messages = [self.message_cls.user(prompt_text)]

        return (
            state,
            self.transition(
                initial=True, terminal=False, messages=prompt_messages,
                think=self.think, media=media,
                info={"cur_img_path": cur_img_path}, context_switch=False,
            ),
        )

    def step(self, state: env_api.State, action: str) -> env_api.Transition:
        assert isinstance(state, ServerState)
        try:
            return self._step_impl(state, action)
        except Exception:
            self._record_server_failure(state.server_url)
            raise

    def _step_impl(self, state: ServerState, action: str) -> env_api.Transition:
        rank_idx = state.rank_idx
        thread_idx = state.thread_idx
        # The model's action text is passed through verbatim — no tokenization.
        action_str = action
        state.past_actions.append(action_str)

        outcomes: dict[str, Any] = {
            "pass": False, "tool": False, "parse": True, "task_completed": 0.0,
        }
        state.step_id += 1

        parsed = self.action_space.parse(action_str, state.emulator_resolution)
        viz_dict = self.action_space.to_viz_dict(parsed) if parsed else {}

        is_ending = parsed is not None and parsed.action_type in (ActionType.STATUS, ActionType.ANSWER)
        terminal = is_ending or (state.step_id == self.max_turns)

        if parsed is not None and not terminal:
            self._execute_action(parsed, state)
            time.sleep(POST_ACTION_SLEEP_SECONDS)
        elif parsed is None:
            outcomes["parse"] = False
            logger.info("Cannot parse action_str: %s", action_str)

        # Save annotated previous screenshot
        prev_img_path = ""
        prev_img_with_action_path = ""
        if self._save_trajectories:
            prev_img_path = (
                f"{self.saved_screenshot_folder}/rank_{rank_idx}_thread_{thread_idx}_"
                f"traj_{state.unique_id}_step_{state.step_id - 1}.png"
            )
            prev_img = Image.open(prev_img_path)
            prev_img_with_action = draw_action_image_only(prev_img, viz_dict)
            prev_img_with_action_path = (
                f"{self.saved_screenshot_folder}/rank_{rank_idx}_thread_{thread_idx}_"
                f"traj_{state.unique_id}_step_{state.step_id - 1}_with_action.png"
            )
            prev_img_with_action.save(prev_img_with_action_path)

        media = self.server_commands.get_screenshot(state)
        assert media is not None, "Failed to capture screenshot from server"

        cur_img_path = ""
        if self._save_trajectories:
            cur_img_path = (
                f"{self.saved_screenshot_folder}/rank_{rank_idx}_thread_{thread_idx}_"
                f"traj_{state.unique_id}_step_{state.step_id}.png"
            )
            media.save(cur_img_path)

        if terminal:
            agent_answer = None
            if parsed is not None and parsed.action_type == ActionType.ANSWER:
                agent_answer = parsed.params.get("message", "")

            verify_response = requests.post(
                f"{state.server_url}/session/verify",
                json={"answer": agent_answer},
                timeout=self._session_timeout,
            )
            verify_response.raise_for_status()
            self._record_server_success(state.server_url)
            verify_data = verify_response.json()

            outcomes["task_completed"] = verify_data.get("score", 0.0)
            outcomes["pass"] = verify_data.get("completed", False)
            outcomes["verify_details"] = verify_data.get("metrics", {})

            for key in ("instance", "profile", "theme", "ui_state"):
                val = getattr(state, key, "")
                if val:
                    outcomes[key] = val

            logger.info("Episode complete: task_completed=%s, task_id=%s", outcomes["task_completed"], state.task_id)

            prompt_messages = None
            media = None
            context_switch = False

            if self._save_trajectories:
                concat_image = concat_trajectory_images(
                    saved_screenshot_folder=self.saved_screenshot_folder,
                    rank_idx=rank_idx, thread_idx=thread_idx,
                    unique_id=state.unique_id, total_steps=state.step_id,
                    title=f"Goal: {state.question}. Pass: {outcomes['pass']}",
                )
                concat_image_path = (
                    f"{self.saved_screenshot_folder}/rank_{rank_idx}_thread_{thread_idx}_"
                    f"traj_{state.unique_id}_concat.png"
                )
                concat_image.save(concat_image_path)

                validation_views = verify_data.get("validation_views", [])
                if validation_views:
                    import base64 as _b64
                    view_paths = []
                    for vv in validation_views:
                        label = vv.get("label", "unknown")
                        img_b64 = vv.get("image_b64", "")
                        if img_b64:
                            view_path = (
                                f"{self.saved_screenshot_folder}/rank_{rank_idx}_thread_{thread_idx}_"
                                f"traj_{state.unique_id}_view_{label}.png"
                            )
                            with open(view_path, "wb") as vf:
                                vf.write(_b64.b64decode(img_b64))
                            view_paths.append(view_path)
                    if view_paths:
                        outcomes["validation_view_paths"] = view_paths
        else:
            prompt_text = self._prompt_template.format(
                action_descriptions=self._action_descriptions,
                goal=state.question,
                past_actions=", ".join(state.past_actions),
            )
            prompt_messages = [self.message_cls.user(prompt_text)]
            context_switch = True

        return self.transition(
            initial=False, messages=prompt_messages, terminal=terminal,
            action_str=action_str, outcomes=outcomes,
            think=self.think, media=media,
            info={
                "goal": state.question,
                "image_paths": {
                    "cur_img_path": cur_img_path,
                    "prev_img_path": prev_img_path,
                    "prev_img_with_action_path": prev_img_with_action_path,
                },
            },
            context_switch=context_switch,
        )

    def teardown(self) -> None:
        # Reachable from __del__ after a failed __init__, so nothing here may
        # assume the constructor ran to completion -- otherwise an AttributeError
        # in __del__ would leave provisioned containers running.
        shutdown_event = getattr(self, "_shutdown_event", None)
        if shutdown_event is not None:
            shutdown_event.set()
        provisioner = getattr(self, "_provisioner", None)
        if provisioner is not None:
            provisioner.teardown()
            self._provisioner = None

    def __del__(self) -> None:
        self.teardown()


def fetch_tasks_by_tag(
    server_url: str, tag: str, params: dict[str, str] | None = None
) -> list[dict]:
    """Fetch a curated task list from a server by tag name."""
    url = f"{server_url.rstrip('/')}/tasks/by-tag/{tag}"
    resp = requests.get(url, timeout=30, params=params)
    resp.raise_for_status()
    tasks = resp.json()
    logger.info("Fetched %d tasks for tag '%s' from %s", len(tasks), tag, server_url)
    return tasks


if "server_env" not in config.ENVS_REGISTRY:
    config.register_env(
        config.EnvConfig(name="server_env", cls=ServerEnv, init_kwargs={})
    )

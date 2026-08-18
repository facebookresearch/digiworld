# Copyright (c) Meta Platforms, Inc. and affiliates.
# Simplified Agent with inline SimpleRollout — no moodist/distributed deps.

import logging
import os
import queue
import threading
import time
from dataclasses import asdict
from typing import Any, Generic, TypeVar

from PIL import Image

from digiworld_eval.lib.args import AgentArgs
from digiworld_eval.lib.core import history as history_utils
from digiworld_eval.lib.core.action_spaces import CUA_ACTION_SPACE
from digiworld_eval.lib.core.actions import (
    ActionType, CoordinateSystem, ParsedAction, StatusValue,
)
from digiworld_eval.lib.core.datatypes import BaseTextDatum
from digiworld_eval.lib.core.history import HistoryEntry
from digiworld_eval.lib.env_api import Trajectory
from digiworld_eval.lib.env_config import TaskIdxDatum, build_env_overrides, get_reward_fn
from digiworld_eval.lib.eval_utils import DataSource, Metrics, RolloutInfo
from digiworld_eval.lib.generator import Generator

logger = logging.getLogger(__name__)

MAX_TASK_RETRIES = 3

T = TypeVar("T")


class MockMoodistQueue(Generic[T]):
    def __init__(self) -> None:
        self._queue: queue.Queue[T] = queue.Queue()

    def put_object(self, item: T) -> None:
        self._queue.put(item)

    def get_object(self) -> T:
        return self._queue.get()

    def qsize(self) -> int:
        return self._queue.qsize()


def _thread_wrapper(target, exc_queue, *args, **kwargs):
    try:
        target(*args, **kwargs)
    except Exception as ex:
        logger.exception(f"Exception in thread {target}:")
        exc_queue.put(ex)


# ---------------------------------------------------------------------------
# SimpleRollout
# ---------------------------------------------------------------------------

class SimpleRollout:
    def __init__(self, generator, max_rollout_len=131072,
                 max_exceptions=0, action_space=None, history_k=None):
        self.generator = generator
        self.max_rollout_len = max_rollout_len
        self.max_exceptions = max_exceptions
        self.action_space = action_space or CUA_ACTION_SPACE
        self._history_k = history_k

    def rollout(self, episode_args, env, rewardfn):
        traj = Trajectory()
        n_exceptions = 0
        state = None
        adapter_history: list[HistoryEntry] = []

        try:
            while True:
                try:
                    state, tr = env.start(episode_args)
                    adapter_history = []
                    initial_screenshot = self._get_screenshot(tr)
                    if initial_screenshot:
                        adapter_history.append(HistoryEntry(
                            step=0, role="user", action=None,
                            screenshot=initial_screenshot,
                            text=getattr(state, "question", None),
                        ))

                    with state:
                        traj.append(tr)
                        while not tr.terminal and len(traj.context) < self.max_rollout_len:
                            action = self._generate_via_adapter(state, tr, adapter_history)

                            tr = env.step(state, action)
                            tr.add_rewards(rewardfn(tr))
                            traj.append(tr)

                            if not tr.terminal:
                                new_screenshot = self._get_screenshot(tr)
                                if new_screenshot:
                                    adapter_history.append(HistoryEntry(
                                        step=len(adapter_history), role="user",
                                        action=None, screenshot=new_screenshot, text=None,
                                    ))
                except Exception as exc:
                    if n_exceptions < self.max_exceptions:
                        n_exceptions += 1
                        logger.exception(f"Rollout attempt {n_exceptions} failed, retrying")
                    else:
                        raise exc from None
                else:
                    break
        finally:
            if state is not None:
                state.close()
        return traj

    def _generate_via_adapter(self, state, tr, adapter_history):
        screenshot = self._get_screenshot(tr)
        if screenshot is None:
            for entry in reversed(adapter_history):
                if entry.role == "user" and entry.screenshot is not None:
                    screenshot = entry.screenshot
                    break
        if screenshot is None:
            impossible = ParsedAction(
                action_type=ActionType.STATUS,
                params={"status": StatusValue.IMPOSSIBLE},
                coordinate_system=CoordinateSystem.PIXELS,
            )
            return self.action_space.to_text(impossible)

        goal = getattr(state, "question", "Complete the task")
        _screen_size = getattr(state, "emulator_resolution", None)
        if _screen_size is None:
            _screen_size = getattr(state, "viewport", None)
        screen_size = _screen_size if _screen_size else (1080, 1920)

        selected = adapter_history
        if self._history_k is not None:
            selected = history_utils.last_k(adapter_history, self._history_k)

        action_obj, _ = self.generator.model_gen.generate_with_adapter(
            goal=goal, screenshot=screenshot, history=selected, screen_size=screen_size,
        )
        if action_obj is None:
            return "unparsable"

        normalized = self.action_space.normalize_coords(
            action_obj, screen_size, CoordinateSystem.NORMALIZED_01
        )
        action_text = self.action_space.to_text(normalized)

        adapter_history.append(HistoryEntry(
            step=len(adapter_history), role="assistant",
            action=action_obj, screenshot=None, text=None,
        ))
        return action_text

    def _get_screenshot(self, tr) -> Image.Image | None:
        img_path = None
        if hasattr(tr, "info") and tr.info:
            img_path = (
                tr.info.get("cur_img_path")
                or tr.info.get("image_paths", {}).get("cur_img_path")
                or tr.info.get("prev_img_path")
            )
        if img_path and os.path.exists(img_path):
            return Image.open(img_path)
        return None


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class Agent:
    def __init__(self, args: AgentArgs) -> None:
        self.generator = Generator(args.generator)
        self.max_rollout_len = args.max_rollout_len
        self.max_exceptions = args.max_exceptions
        self.num_rollout_threads = args.num_rollout_threads

        runtime_kwargs: dict[str, Any] = {}
        runtime_kwargs["media_transform"] = None
        runtime_kwargs["media_placeholder_tag"] = ""

        action_space = CUA_ACTION_SPACE
        runtime_kwargs["action_space"] = action_space
        if args.prompt_template is not None:
            runtime_kwargs["prompt_template"] = args.prompt_template
        if args.history_k is not None:
            runtime_kwargs["history_fn"] = lambda h: history_utils.last_k(h, args.history_k)

        self._action_space = action_space
        self._agent_args = args

        self.environments_and_rewards = [
            (build_env_overrides(task, **runtime_kwargs), get_reward_fn(task.reward_fn))
            for task in args.tasks
        ]
        self.tasks = args.tasks
        assert len(self.environments_and_rewards) > 0

        for env, _ in self.environments_and_rewards:
            capacity = getattr(env, "max_concurrent_episodes", None)
            if capacity is not None and capacity < self.num_rollout_threads:
                logger.warning(
                    "Reducing num_rollout_threads from %d to %d",
                    self.num_rollout_threads, capacity,
                )
                self.num_rollout_threads = capacity

        self.data_queue = MockMoodistQueue[TaskIdxDatum]()
        self.dump_queue = MockMoodistQueue[dict]()
        self.exc_queue = queue.Queue[Exception]()
        self.done_queue = queue.Queue[bool]()
        self._retry_counts: dict[str, int] = {}
        self._requeued_tasks: set[str] = set()
        self._requeued_lock = threading.Lock()
        self.rollout_threads: list[threading.Thread] = []

        self.rollout_strategy = SimpleRollout(
            generator=self.generator,
            max_rollout_len=self.max_rollout_len,
            max_exceptions=self.max_exceptions,
            action_space=self._action_space,
            history_k=self._agent_args.history_k,
        )

    def rollout_threads_start(self) -> None:
        self.exc_queue = queue.Queue[Exception]()
        self.done_queue = queue.Queue[bool]()
        self.rollout_threads = []
        for t_idx in range(self.num_rollout_threads):
            t = threading.Thread(
                target=_thread_wrapper,
                kwargs=dict(target=self.rollout_thread, exc_queue=self.exc_queue, thread_idx=t_idx),
            )
            self.rollout_threads.append(t)
            t.start()

    def rollout_generations(self) -> None:
        done = False
        while not done:
            done = self.generator.model_gen.work()
            if self.done_queue.qsize() >= self.num_rollout_threads:
                self.generator.model_gen.stop()
            try:
                ex = self.exc_queue.get_nowait()
            except queue.Empty:
                pass
            else:
                raise RuntimeError("Exception in thread") from ex
        for t in self.rollout_threads:
            t.join()

    def rollout_thread(self, thread_idx: int) -> None:
        while True:
            data = self.data_queue.get_object()
            if data is None:
                with self._requeued_lock:
                    has_pending = len(self._requeued_tasks) > 0
                if has_pending:
                    self.data_queue.put_object(None)
                    time.sleep(0.1)
                    continue
                self.done_queue.put(True)
                self.dump_queue.put_object(None)
                return

            assert isinstance(data, TaskIdxDatum)
            task_args, env_idx, start_args = data.val
            start = time.monotonic()
            start_args["thread_idx"] = thread_idx
            start_args["rank_idx"] = 0
            start_args["rollout_threads_per_rank"] = self.num_rollout_threads

            try:
                env, rewardfn_ctor = self.environments_and_rewards[env_idx]
                rewardfn = rewardfn_ctor()
                traj = self.rollout_strategy.rollout(start_args, env, rewardfn)
                end = time.monotonic()

                if isinstance(data.src, BaseTextDatum.Source):
                    data_src = DataSource.from_base_text_datum_source(data.src)
                    data_src_dict = asdict(data_src)
                else:
                    data_src = None
                    data_src_dict = None

                assert traj.transitions[-1].rewards is not None
                metrics: Metrics = {
                    "data_src": data_src_dict,
                    "task_name": task_args.name,
                    "terminal_rewards": traj.transitions[-1].rewards[-1],
                    "terminal_metrics": traj.transitions[-1].outcomes,
                }
                rollout_info = RolloutInfo(
                    traj=traj, start_args=dict(start_args),
                    begin_step=-1, end_step=-1,
                    rl_task_args=self.tasks[env_idx],
                    metrics={"rollout/duration": end - start},
                    data_src=data_src,
                )
                self.dump_queue.put_object({"rollouts": [rollout_info], "metrics": [metrics]})

                with self._requeued_lock:
                    self._requeued_tasks.discard(data.id())
                    self._retry_counts.pop(data.id(), None)
            except Exception:
                task_id = data.id()
                retry_count = self._retry_counts.get(task_id, 0)
                if retry_count < MAX_TASK_RETRIES:
                    self._retry_counts[task_id] = retry_count + 1
                    logger.error(f"Thread {thread_idx} failed on {task_id} (attempt {retry_count+1})", exc_info=True)
                    with self._requeued_lock:
                        self._requeued_tasks.add(task_id)
                    self.data_queue.put_object(data)
                else:
                    logger.error(f"Thread {thread_idx} gave up on {task_id} after {MAX_TASK_RETRIES} retries", exc_info=True)
                    with self._requeued_lock:
                        self._requeued_tasks.discard(task_id)

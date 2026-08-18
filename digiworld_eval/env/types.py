# Copyright (c) Meta Platforms, Inc. and affiliates.
from dataclasses import dataclass

from digiworld_eval.lib.env_api import State


@dataclass
class ServerState(State):
    """State for server-backed DigiWorld environments."""

    unique_id: str
    rank_idx: int
    thread_idx: int
    question: str
    step_id: int
    step_0_time: float
    ip_address: str
    emulator_resolution: tuple[int, int]
    past_actions: list[str]

    server_url: str = ""
    task_id: str = ""
    initial_state_id: str = ""

    instance: str = ""
    profile: str = ""
    theme: str = ""
    ui_state: str = ""

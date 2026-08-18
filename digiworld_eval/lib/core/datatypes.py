# Copyright (c) Meta Platforms, Inc. and affiliates.
# Minimal message / datum types used by digiworld_eval.

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import KW_ONLY, dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Generic, TypeVar

T = TypeVar("T")

class Role(str, Enum):
    system = "system"
    user = "user"
    assistant = "assistant"
    ipython = "ipython"
    tool = "tool"


@dataclass
class MessageBase:
    # role. e.g. user/assistant/system/ipython
    source: Role

    # Primary content of the message
    body: str

    version: str

    # Whether to use an EOT token when ending a message or EOM (legacy)
    eot: bool = False

    # Use metadata for experimental information
    metadata: Any | None = None

    # For now, only supports ipython as tool
    ipython: bool = False

    @property
    def source_str(self) -> str:
        return self.source.strip()

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}

@dataclass
class LlamaChatMessage(MessageBase):
    # following Llama message formats
    version: str = "message_v2"

    # Helper builder functions to illustrate how to use this message type.
    @classmethod
    def system(cls, body: str) -> "LlamaChatMessage":
        return LlamaChatMessage(source=Role.system, body=body, eot=True)

    @classmethod
    def user(cls, body: str) -> "LlamaChatMessage":
        return LlamaChatMessage(source=Role.user, body=body, eot=True)

    @classmethod
    def assistant(cls, body: str = "") -> "LlamaChatMessage":
        return LlamaChatMessage(source=Role.assistant, body=body, eot=False)

    @classmethod
    def assistant_eot(cls, body: str = "") -> "LlamaChatMessage":
        return LlamaChatMessage(source=Role.assistant, body=body, eot=True)

    @classmethod
    def ipython_call(cls, body: str, *, eot: bool = False) -> "LlamaChatMessage":
        return LlamaChatMessage(source=Role.assistant, body=body, eot=eot, ipython=True)

    @classmethod
    def ipython_return(cls, body: str) -> "LlamaChatMessage":
        return LlamaChatMessage(source=Role.ipython, body=body, eot=False)

    def __str__(self) -> str:
        body = repr(self.body)
        ending = "eot" if self.eot else "eom"
        return f"[{self.source},{ending}] {body}"

    def assert_valid(self) -> None:
        self.check_version()
        self.check_source()
        self.check_body()
        self.check_eot()

    def check_source(self) -> None:
        assert self.source in [Role.user, Role.assistant, Role.system, Role.ipython]

    def check_version(self) -> None:
        assert self.version == "message_v2"

    def check_body(self) -> None:
        if self.source in [Role.system, Role.ipython]:
            return
        assert self.body is not None
        assert self.body.strip() != ""

    def check_eot(self) -> None:
        if self.source in [Role.user, Role.system]:
            assert self.eot

    @classmethod
    def from_dict(cls, repr_dict: dict) -> "LlamaChatMessage":
        return LlamaChatMessage(
            source=repr_dict["source"],
            eot=repr_dict["eot"],
            body=repr_dict["body"],
            metadata=repr_dict.get("metadata"),  # ok if not present
            ipython=repr_dict["ipython"],
        )

@dataclass
class BaseTextDatum(Generic[T]):
    @dataclass
    class Source:
        path: Path
        line_no: int
        pos: int

    val: T
    _: KW_ONLY
    src: Source | Sequence[Source] | Any = None

    def __len__(self):
        return len(self.val)


@dataclass
class DictDatum(BaseTextDatum[dict]):
    pass

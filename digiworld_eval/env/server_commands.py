# Copyright (c) Meta Platforms, Inc. and affiliates.
import io
import logging
import time
from collections.abc import Callable
from typing import Any

import requests
from PIL import Image, ImageOps

from digiworld_eval.env.types import ServerState

logger: logging.Logger = logging.getLogger(__name__)


def _request_with_retries(
    request_fn: Callable[..., requests.Response],
    url: str,
    max_retries: int,
    request_kwargs: dict[str, Any],
) -> requests.Response:
    retries = 0
    while True:
        try:
            return request_fn(url, **request_kwargs)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
            retries += 1
            if retries >= max_retries:
                raise
            logger.warning(
                "Connection error for %s (attempt %d/%d). Retrying in 5s...",
                url,
                retries,
                max_retries,
            )
            time.sleep(5)


class ServerCommands:
    """HTTP client for environment server device endpoints."""

    def __init__(self, max_retries: int = 5, timeout: int = 30) -> None:
        self.max_retries = max_retries
        self.timeout = timeout

    def send_command(self, domain: str, command: str) -> bytes | None:
        url = f"{domain}/device/command"
        response = _request_with_retries(
            request_fn=requests.post,
            url=url,
            max_retries=self.max_retries,
            request_kwargs={
                "json": {"command": command, "timeout": self.timeout},
                "timeout": self.timeout + 5,
            },
        )
        if response.status_code == 200:
            stdout = response.json().get("stdout", "")
            logger.info("[%s] Command executed: %s", domain, command)
            return stdout.encode("utf-8") if stdout else b""
        logger.warning(
            "[%s] Command failed (status %d): %s", domain, response.status_code, command
        )
        return None

    def get_screenshot(self, state: ServerState) -> Image.Image | None:
        url = f"{state.ip_address}/device/screenshot"
        response = _request_with_retries(
            request_fn=requests.get,
            url=url,
            max_retries=self.max_retries,
            request_kwargs={"timeout": self.timeout},
        )
        if response.status_code == 200 and response.content:
            img = Image.open(io.BytesIO(response.content))
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")
            return img
        logger.warning(
            "[%s] Screenshot failed (status %d)", state.ip_address, response.status_code
        )
        return None

    def get_emulator_resolution(self, domain: str) -> tuple[int, int] | None:
        url = f"{domain}/device/resolution"
        response = _request_with_retries(
            request_fn=requests.get,
            url=url,
            max_retries=self.max_retries,
            request_kwargs={"timeout": self.timeout},
        )
        if response.status_code == 200:
            data = response.json()
            logger.info("[%s] Resolution: %dx%d", domain, data["width"], data["height"])
            return (data["width"], data["height"])
        logger.warning(
            "[%s] Resolution query failed (status %d)", domain, response.status_code
        )
        return None

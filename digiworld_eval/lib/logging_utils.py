# Copyright (c) Meta Platforms, Inc. and affiliates.
# Root logger setup for the eval.
# Single-process, so no rank gating on the file handler.

import logging
import sys
from contextlib import suppress
from pathlib import Path

_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


def set_root_log_level(log_level: str) -> None:
    logger = logging.getLogger()
    level: int | str = log_level.upper()
    with suppress(ValueError):
        level = int(log_level)
    try:
        logger.setLevel(level)
    except (TypeError, ValueError):
        logger.warning("Failed to set log level to %s, using NOTSET", log_level)
        logger.setLevel(logging.NOTSET)


def initialize_logger(name: str | None = None, level: str = "NOTSET") -> None:
    set_root_log_level(level)
    logger = logging.getLogger()
    fmt = logging.Formatter(_FORMAT)

    for noisy in ("asyncio", "urllib3.connectionpool", "fsspec", "botocore", "s3fs"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setLevel(logging.NOTSET)
    stdout_handler.setFormatter(fmt)

    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setLevel(logging.WARNING)
    stderr_handler.setFormatter(fmt)

    logger.handlers.clear()
    logger.handlers.append(stdout_handler)
    logger.handlers.append(stderr_handler)


def add_logger_file_handler(log_file: str | Path) -> None:
    logger = logging.getLogger()
    Path(log_file).parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(log_file, "a")
    file_handler.setLevel(logging.NOTSET)
    file_handler.setFormatter(logging.Formatter(_FORMAT))
    logger.handlers.append(file_handler)

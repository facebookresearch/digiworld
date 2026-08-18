# Copyright (c) Meta Platforms, Inc. and affiliates.
# save_params for config dumps.

import logging
from pathlib import Path
from typing import Any

from omegaconf import OmegaConf

logger = logging.getLogger(__name__)


def save_params(params: Any, path: Path | str, *, log_params: bool = True) -> None:
    """Dump a params dataclass instance to a YAML file.

    Serialize the dataclass instance via OmegaConf and write the YAML to ``path``.
    """
    config = OmegaConf.to_container(
        OmegaConf.structured(params), resolve=False, enum_to_str=False
    )
    yaml_str = OmegaConf.to_yaml(OmegaConf.create(config))
    if log_params:
        logger.info("Using the following params for this run:\n%s", yaml_str)
    Path(path).write_text(yaml_str)

# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Instance generation for 'Send a message to <contact_name>, then call <contact_name> using the video call function'."""

import json
from pathlib import Path
from typing import Any, Dict, List

from digiworld.scenarios.builders import slugify, write_mockdata
from digiworld.scenarios.scenarios.message.shared import (
    ContactNameBatch,
    message_user_record,
)

DIVERSITY_SPEC = {
    "context": ["friends", "family", "work"],
}


def generate_instances(
    plan: List[Dict[str, Any]], llm: Any, rng: Any
) -> List[Dict[str, Any]]:
    count = len(plan)
    context_list = [p.get("context", "friends") for p in plan]
    context_desc = ", ".join(
        f"Instance {i + 1}: {ctx} context" for i, ctx in enumerate(context_list)
    )
    prompt = (
        f"Generate exactly {count} realistic full person names for contacts "
        f"you would first text and then video call in a messaging app. "
        f"Include diverse genders and cultural backgrounds. "
        f"All names must be unique -- no repeated first or last names. "
        f"Context per instance: {context_desc}. "
        f"Return JSON with key 'names' as a list of strings."
    )
    raw = llm.invoke_text(prompt, data_model=ContactNameBatch)
    parsed = json.loads(raw)

    specs: List[Dict[str, Any]] = []
    for i, point in enumerate(plan):
        name = parsed["names"][i]
        specs.append({
            "name": f"{point.get('context', 'friends')}_{slugify(name)}_{i}",
            "parameters": {"contact_name": name},
            "generate_mockdata": True,
            "mockdata_config": {
                "contact_name": name,
                "contact_id": f"contact-{12001 + i}",
            },
        })
    return specs


def build_mockdata(
    spec: Dict[str, Any], mockdata_dir: Path, rng: Any
) -> None:
    cfg = spec["mockdata_config"]
    write_mockdata(
        mockdata_dir / "mock-users.json",
        [message_user_record(cfg["contact_name"], user_id=cfg["contact_id"])],
    )

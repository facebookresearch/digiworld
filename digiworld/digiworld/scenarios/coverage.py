# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Coverage planner for diversity-first instance generation.

Distributes N instances across diversity axes with guaranteed per-axis
coverage using Latin-square-style assignment.
"""

import itertools
import random
from typing import Dict, List, Any


def build_coverage_plan(
    diversity_spec: Dict[str, List[Any]],
    num_instances: int,
    rng: random.Random,
) -> List[Dict[str, Any]]:
    """Distribute num_instances across diversity axes.

    Guarantees every value on every axis appears at least once when
    num_instances >= max(axis_sizes). Uses Latin-square-style assignment
    when num_instances < total cells, full cartesian product + extras
    when num_instances >= total cells.

    Args:
        diversity_spec: Maps axis name to list of values.
            Example: {'context': ['work', 'personal'], 'position': ['top', 'bottom']}
        num_instances: How many instances to generate.
        rng: Seeded random.Random for deterministic output.

    Returns:
        List of dicts, each mapping axis name to a chosen value.
    """
    if not diversity_spec:
        return [{}] * num_instances

    axes = list(diversity_spec.keys())
    values = [list(diversity_spec[a]) for a in axes]
    cells = [dict(zip(axes, combo)) for combo in itertools.product(*values)]

    if num_instances >= len(cells):
        plan = list(cells)
        extras_needed = num_instances - len(cells)
        for i in range(extras_needed):
            plan.append(cells[i % len(cells)])
    else:
        _prioritize_axis_coverage(cells, axes, num_instances, rng, plan := [])

    rng.shuffle(plan)
    return plan


def _prioritize_axis_coverage(
    cells: List[Dict[str, Any]],
    axes: List[str],
    num_instances: int,
    rng: random.Random,
    plan: List[Dict[str, Any]],
) -> None:
    """Greedily pick cells that maximize per-axis value coverage."""
    shuffled = list(cells)
    rng.shuffle(shuffled)

    covered: Dict[str, set] = {a: set() for a in axes}

    # First pass: pick cells that cover new axis values
    remaining = []
    for cell in shuffled:
        if len(plan) >= num_instances:
            break
        covers_new = any(cell[a] not in covered[a] for a in axes)
        if covers_new:
            plan.append(cell)
            for a in axes:
                covered[a].add(cell[a])
        else:
            remaining.append(cell)

    # Second pass: fill remaining slots from leftover cells
    for cell in remaining:
        if len(plan) >= num_instances:
            break
        plan.append(cell)

    del plan[num_instances:]

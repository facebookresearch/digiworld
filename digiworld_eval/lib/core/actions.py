# Copyright (c) Meta Platforms, Inc. and affiliates.
# Standalone action space + parsing (no external deps).

import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Literal

NORMALIZED_COORD_MAX: int = 999

_PARAM_TYPE_REGEX: dict[str, str] = {
    "coordinate": r"(\d+(?:\.\d+)?)",
    "text": r"(.*)",
    "enum": r"['\"]*(.*?)['\"]*",
    "integer": r"(\d+)",
}


class CoordinateSystem(str, Enum):
    PIXELS = "pixels"
    NORMALIZED_01 = "normalized_01"
    NORMALIZED_999 = "normalized_999"


class ActionType(str, Enum):
    TAP = "tap"
    LONG_PRESS = "long_press"
    SWIPE = "swipe"
    TYPE = "type"
    SCROLL = "scroll"
    NAVIGATE = "navigate"
    STATUS = "status"
    ANSWER = "answer"


class StatusValue(str, Enum):
    COMPLETE = "complete"
    IMPOSSIBLE = "impossible"


_COORD_TOOL_INFO: dict[CoordinateSystem, dict[str, Any]] = {
    CoordinateSystem.PIXELS: {
        "action_suffix": "Coordinates are in pixels.",
        "param_suffix": " in pixels",
        "json_type": "integer",
    },
    CoordinateSystem.NORMALIZED_01: {
        "action_suffix": "Coordinates are normalized 0-1 where (0,0) is top-left.",
        "param_suffix": " (0-1 normalized)",
        "json_type": "number",
        "minimum": 0,
        "maximum": 1,
    },
    CoordinateSystem.NORMALIZED_999: {
        "action_suffix": "Coordinates are normalized 0-999 where (0,0) is top-left and (999,999) is bottom-right.",
        "param_suffix": " (0-999 normalized, must be between 0 and 999)",
        "json_type": "integer",
        "minimum": 0,
        "maximum": 999,
    },
}


@dataclass(frozen=True)
class ActionParam:
    name: str
    param_type: Literal["coordinate", "text", "enum", "integer"]
    description: str
    required: bool = True
    enum_values: tuple[str, ...] | None = None
    default: Any = None
    viz_name: str | None = None


@dataclass(frozen=True)
class ActionDefinition:
    action_type: ActionType
    description: str
    params: tuple[ActionParam, ...]
    examples: dict[CoordinateSystem, str]
    aliases: tuple[str, ...] = ()
    keyword_fallbacks: tuple[str, ...] = ()
    fallback_defaults: dict[str, Any] | None = None


@dataclass(frozen=True)
class ParsedAction:
    action_type: ActionType
    params: dict[str, Any]
    coordinate_system: CoordinateSystem
    raw: str = ""


def _has_decimal(s: str) -> bool:
    return "." in s


def _get_dimension(param_name: str, screen_size: tuple[int, int]) -> int:
    if param_name.startswith("x"):
        return screen_size[0]
    if param_name.startswith("y"):
        return screen_size[1]
    raise ValueError(
        f"Cannot determine dimension for coordinate param '{param_name}': "
        "name must start with 'x' (width) or 'y' (height)"
    )


def _convert_coord(
    value: float | int,
    source: CoordinateSystem,
    target: CoordinateSystem,
    dim: int,
) -> float | int:
    if source == target:
        return value
    if source == CoordinateSystem.PIXELS:
        if target == CoordinateSystem.NORMALIZED_01:
            return value / dim
        return int(value / dim * NORMALIZED_COORD_MAX)
    if source == CoordinateSystem.NORMALIZED_01:
        if target == CoordinateSystem.PIXELS:
            return int(value * dim)
        return int(value * NORMALIZED_COORD_MAX)
    if target == CoordinateSystem.PIXELS:
        return round(value / NORMALIZED_COORD_MAX * dim)
    return value / NORMALIZED_COORD_MAX


class ActionSpace:
    def __init__(self, definitions: list[ActionDefinition]) -> None:
        self._definitions: dict[ActionType, ActionDefinition] = {
            d.action_type: d for d in definitions
        }
        self._func_name_to_defn: dict[str, ActionDefinition] = {
            d.action_type.value: d for d in definitions
        }
        self._patterns: list[tuple[ActionDefinition, re.Pattern[str]]] = [
            (d, self._build_regex(d)) for d in definitions
        ]
        self._alias_patterns: list[tuple[ActionDefinition, re.Pattern[str]]] = []
        for d in definitions:
            if d.aliases:
                alt = "|".join(re.escape(a) for a in d.aliases)
                pattern = re.compile(rf"(?:{alt})\(['\"]*(.*?)['\"]*\)")
                self._alias_patterns.append((d, pattern))

    @staticmethod
    def _build_regex(defn: ActionDefinition) -> re.Pattern[str]:
        fragments: list[str] = []
        for p in defn.params:
            if not p.required:
                continue
            frag = _PARAM_TYPE_REGEX.get(p.param_type)
            if frag is None:
                raise ValueError(
                    f"Unknown param_type '{p.param_type}' for param '{p.name}' "
                    f"in action '{defn.action_type.value}'"
                )
            fragments.append(frag)
        joined = r",\s*".join(fragments)
        return re.compile(
            rf"{re.escape(defn.action_type.value)}\({joined}\)", re.DOTALL
        )

    @staticmethod
    def _extract_params(
        defn: ActionDefinition,
        match: re.Match[str],
        screen_size: tuple[int, int],
    ) -> dict[str, Any] | None:
        params: dict[str, Any] = {}
        coord_raw_strings: list[str] = []
        coord_param_names: list[str] = []
        required_params = [p for p in defn.params if p.required]
        for i, param in enumerate(required_params):
            raw_value = match.group(i + 1)
            if param.param_type == "coordinate":
                coord_raw_strings.append(raw_value)
                coord_param_names.append(param.name)
                params[param.name] = float(raw_value)
            elif param.param_type == "text":
                if (
                    len(raw_value) >= 2
                    and raw_value[0] in ("'", '"')
                    and raw_value[-1] == raw_value[0]
                ):
                    raw_value = raw_value[1:-1]
                params[param.name] = raw_value
            elif param.param_type == "enum":
                value = raw_value.lower()
                if param.enum_values is not None and value not in param.enum_values:
                    return None
                params[param.name] = value
            elif param.param_type == "integer":
                params[param.name] = int(raw_value)
        if coord_raw_strings:
            is_normalized = any(_has_decimal(s) for s in coord_raw_strings)
            for name in coord_param_names:
                dim = _get_dimension(name, screen_size)
                if is_normalized:
                    params[name] = int(params[name] * dim)
                else:
                    params[name] = int(params[name])
        return params

    def get_definition(self, action_type: ActionType) -> "ActionDefinition | None":
        return self._definitions.get(action_type)

    def get_definition_by_name(self, func_name: str) -> "ActionDefinition | None":
        return self._func_name_to_defn.get(func_name)

    def parse(
        self,
        action_str: str,
        screen_size: tuple[int, int],
    ) -> ParsedAction | None:
        for defn, pattern in self._patterns:
            match = pattern.match(action_str)
            if match:
                params = self._extract_params(defn, match, screen_size)
                if params is not None:
                    return ParsedAction(
                        action_type=defn.action_type,
                        params=params,
                        coordinate_system=CoordinateSystem.PIXELS,
                        raw=action_str,
                    )
        for defn, pattern in self._alias_patterns:
            match = pattern.match(action_str)
            if match:
                params = dict(defn.fallback_defaults) if defn.fallback_defaults else {}
                captured = match.group(1).strip() if match.lastindex else ""
                if captured:
                    for param in defn.params:
                        if (
                            not param.required
                            and param.param_type == "text"
                            and param.name not in params
                        ):
                            params[param.name] = captured
                            break
                return ParsedAction(
                    action_type=defn.action_type,
                    params=params,
                    coordinate_system=CoordinateSystem.PIXELS,
                    raw=action_str,
                )
        return self.match_keyword_fallback(action_str)

    def get_completion_instruction(self) -> str:
        for defn in self._definitions.values():
            if not defn.keyword_fallbacks:
                continue
            enum_param = next(
                (p for p in defn.params if p.param_type == "enum" and p.required),
                None,
            )
            if enum_param is None or not enum_param.enum_values:
                continue
            calls = " or ".join(
                f"{defn.action_type.value}({v.value if isinstance(v, Enum) else v})"
                for v in enum_param.enum_values
            )
            return f"Call {calls} to report task status."
        return ""

    def match_keyword_fallback(
        self,
        text: str,
        coord_system: CoordinateSystem = CoordinateSystem.PIXELS,
    ) -> ParsedAction | None:
        text_lower = text.lower()
        for defn, _ in self._patterns:
            for keyword in defn.keyword_fallbacks:
                if keyword in text_lower:
                    defaults = (
                        dict(defn.fallback_defaults) if defn.fallback_defaults else {}
                    )
                    return ParsedAction(
                        action_type=defn.action_type,
                        params=defaults,
                        coordinate_system=coord_system,
                        raw=text,
                    )
        return None

    def from_function_call(
        self,
        func_name: str,
        args: dict[str, Any],
        coord_system: CoordinateSystem,
    ) -> ParsedAction | None:
        defn = self._func_name_to_defn.get(func_name)
        if defn is None:
            return None
        params: dict[str, Any] = {}
        for param in defn.params:
            if param.name in args:
                value = args[param.name]
                if param.param_type == "coordinate":
                    value = float(value)
                elif param.param_type == "integer":
                    value = int(value)
                elif param.param_type == "enum":
                    value = str(value).lower()
                    if param.enum_values is not None:
                        if param.enum_values and isinstance(param.enum_values[0], Enum):
                            enum_class = type(param.enum_values[0])
                            try:
                                value = enum_class(value)
                            except ValueError:
                                return None
                        elif value not in param.enum_values:
                            return None
                elif param.param_type == "text":
                    value = str(value)
                params[param.name] = value
            elif param.required:
                return None
            elif param.default is not None:
                params[param.name] = param.default
        return ParsedAction(
            action_type=defn.action_type,
            params=params,
            coordinate_system=coord_system,
        )

    def get_tool_definitions(
        self,
        coord_system: CoordinateSystem,
    ) -> list[dict[str, Any]]:
        info = _COORD_TOOL_INFO[coord_system]
        tools: list[dict[str, Any]] = []
        for defn in self._definitions.values():
            has_coords = any(p.param_type == "coordinate" for p in defn.params)
            if has_coords:
                description = f"{defn.description}. {info['action_suffix']}"
            else:
                description = f"{defn.description}."
            properties: dict[str, dict[str, Any]] = {}
            required: list[str] = []
            for param in defn.params:
                prop: dict[str, Any] = {}
                if param.param_type == "coordinate":
                    prop["type"] = info["json_type"]
                    prop["description"] = param.description + info["param_suffix"]
                    if "minimum" in info:
                        prop["minimum"] = info["minimum"]
                    if "maximum" in info:
                        prop["maximum"] = info["maximum"]
                elif param.param_type == "text":
                    prop["type"] = "string"
                    prop["description"] = param.description
                elif param.param_type == "enum":
                    prop["type"] = "string"
                    if param.enum_values is not None:
                        prop["enum"] = list(param.enum_values)
                    prop["description"] = param.description
                elif param.param_type == "integer":
                    prop["type"] = "integer"
                    prop["description"] = param.description
                properties[param.name] = prop
                if param.required:
                    required.append(param.name)
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": defn.action_type.value,
                        "description": description,
                        "parameters": {
                            "type": "object",
                            "properties": properties,
                            "required": required,
                        },
                    },
                }
            )
        return tools

    def get_prompt_description(self, coord_system: CoordinateSystem) -> str:
        lines: list[str] = []
        for defn in self._definitions.values():
            param_names = ", ".join(p.name for p in defn.params if p.required)
            desc = defn.description
            enum_suffixes: list[str] = []
            for p in defn.params:
                if p.param_type == "enum" and p.enum_values is not None:
                    enum_suffixes.append(f"{{{', '.join(p.enum_values)}}}")
            if enum_suffixes:
                desc += ": " + ", ".join(enum_suffixes)
            example = defn.examples.get(coord_system, "")
            lines.append(
                f"- {defn.action_type.value}({param_names}): {desc}. "
                f"Example: {example}."
            )
        return "\n".join(lines)

    def normalize_coords(
        self,
        action: ParsedAction,
        screen_size: tuple[int, int],
        target: CoordinateSystem,
    ) -> ParsedAction:
        if action.coordinate_system == target:
            return ParsedAction(
                action_type=action.action_type,
                params=dict(action.params),
                coordinate_system=target,
                raw=action.raw,
            )
        defn = self._definitions.get(action.action_type)
        if defn is None:
            raise ValueError(f"Unknown action type: {action.action_type}")
        new_params = dict(action.params)
        for param in defn.params:
            if param.param_type == "coordinate" and param.name in new_params:
                dim = _get_dimension(param.name, screen_size)
                new_params[param.name] = _convert_coord(
                    new_params[param.name],
                    action.coordinate_system,
                    target,
                    dim,
                )
        return ParsedAction(
            action_type=action.action_type,
            params=new_params,
            coordinate_system=target,
            raw=action.raw,
        )

    def to_text(self, action: ParsedAction) -> str:
        defn = self._definitions.get(action.action_type)
        if defn is None:
            raise ValueError(f"Unknown action type: {action.action_type}")
        parts: list[str] = []
        for param in defn.params:
            if param.name not in action.params:
                continue
            value = action.params[param.name]
            if param.param_type == "coordinate":
                if action.coordinate_system == CoordinateSystem.NORMALIZED_01:
                    parts.append(f"{value:.3f}")
                else:
                    parts.append(str(int(value)))
            elif param.param_type == "text":
                parts.append(f"'{value}'")
            else:
                text = value.value if isinstance(value, Enum) else str(value)
                parts.append(text)
        return f"{action.action_type.value}({', '.join(parts)})"

    def to_viz_dict(self, action: ParsedAction) -> dict[str, Any]:
        defn = self._definitions.get(action.action_type)
        if defn is None:
            return {"type": action.raw}
        viz_params: dict[str, Any] = {}
        for param in defn.params:
            if param.name in action.params:
                key = param.viz_name if param.viz_name is not None else param.name
                viz_params[key] = action.params[param.name]
        return {"type": action.action_type.value, "params": viz_params}

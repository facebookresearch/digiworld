# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld_eval.lib.core.actions import (
    ActionDefinition,
    ActionParam,
    ActionSpace,
    ActionType,
    CoordinateSystem,
    StatusValue,
)

CUA_ACTION_SPACE = ActionSpace(
    [
        ActionDefinition(
            action_type=ActionType.TAP,
            description="Tap at screen coordinates",
            params=(
                ActionParam("x", "coordinate", "X coordinate"),
                ActionParam("y", "coordinate", "Y coordinate"),
            ),
            examples={
                CoordinateSystem.PIXELS: "tap(195, 300)",
                CoordinateSystem.NORMALIZED_01: "tap(0.312, 0.589)",
                CoordinateSystem.NORMALIZED_999: "tap(312, 589)",
            },
        ),
        ActionDefinition(
            action_type=ActionType.LONG_PRESS,
            description="Long press at screen coordinates",
            params=(
                ActionParam("x", "coordinate", "X coordinate"),
                ActionParam("y", "coordinate", "Y coordinate"),
                ActionParam(
                    "duration_ms", "integer",
                    "Duration in milliseconds (default 500)",
                    required=False, default=500,
                ),
            ),
            examples={
                CoordinateSystem.PIXELS: "long_press(195, 300)",
                CoordinateSystem.NORMALIZED_01: "long_press(0.312, 0.589)",
                CoordinateSystem.NORMALIZED_999: "long_press(312, 589)",
            },
        ),
        ActionDefinition(
            action_type=ActionType.SWIPE,
            description="Swipe from start to end coordinates",
            params=(
                ActionParam("x1", "coordinate", "Start X coordinate", viz_name="x0"),
                ActionParam("y1", "coordinate", "Start Y coordinate", viz_name="y0"),
                ActionParam("x2", "coordinate", "End X coordinate", viz_name="x1"),
                ActionParam("y2", "coordinate", "End Y coordinate", viz_name="y1"),
            ),
            examples={
                CoordinateSystem.PIXELS: "swipe(100, 400, 100, 200)",
                CoordinateSystem.NORMALIZED_01: "swipe(0.171, 0.350, 0.899, 0.357)",
                CoordinateSystem.NORMALIZED_999: "swipe(171, 350, 899, 357)",
            },
        ),
        ActionDefinition(
            action_type=ActionType.TYPE,
            description="Type text on the screen",
            params=(ActionParam("text", "text", "Text to type"),),
            examples={
                CoordinateSystem.PIXELS: "type('Hello')",
                CoordinateSystem.NORMALIZED_01: "type('Hello')",
                CoordinateSystem.NORMALIZED_999: "type('Hello')",
            },
        ),
        ActionDefinition(
            action_type=ActionType.SCROLL,
            description="Scroll the screen in a direction",
            params=(
                ActionParam(
                    "direction", "enum", "Scroll direction",
                    enum_values=("up", "down", "left", "right"),
                ),
            ),
            examples={
                CoordinateSystem.PIXELS: "scroll(down)",
                CoordinateSystem.NORMALIZED_01: "scroll(down)",
                CoordinateSystem.NORMALIZED_999: "scroll(down)",
            },
        ),
        ActionDefinition(
            action_type=ActionType.NAVIGATE,
            description="Navigate using system buttons",
            params=(
                ActionParam(
                    "option", "enum", "Navigation option",
                    enum_values=("back", "forward", "home", "enter"),
                ),
            ),
            examples={
                CoordinateSystem.PIXELS: "navigate(back)",
                CoordinateSystem.NORMALIZED_01: "navigate(back)",
                CoordinateSystem.NORMALIZED_999: "navigate(back)",
            },
        ),
        ActionDefinition(
            action_type=ActionType.STATUS,
            description="Signal that a UI action task is complete or impossible. Ends the interaction. Use only when the task asks you to perform an action (e.g. add, delete, navigate, configure) and you have finished. Do NOT use this for tasks that ask you to find or report information -- use answer() instead",
            params=(
                ActionParam(
                    "status", "enum", "Task status",
                    enum_values=(StatusValue.COMPLETE, StatusValue.IMPOSSIBLE),
                    viz_name="text",
                ),
                ActionParam(
                    "reason", "text", "Optional reason for the status",
                    required=False,
                ),
            ),
            examples={
                CoordinateSystem.PIXELS: "status(complete)",
                CoordinateSystem.NORMALIZED_01: "status(complete)",
                CoordinateSystem.NORMALIZED_999: "status(complete)",
            },
            aliases=("end", "complete"),
            keyword_fallbacks=("complete",),
            fallback_defaults={"status": StatusValue.COMPLETE},
        ),
        ActionDefinition(
            action_type=ActionType.ANSWER,
            description="Report the answer to a question or information retrieval task. Ends the interaction. Use this whenever the task asks you to find, check, look up, or report information (e.g. price, rating, status, count, date). Include the requested data in your answer",
            params=(ActionParam("message", "text", "The answer text"),),
            examples={
                CoordinateSystem.PIXELS: "answer('6 subscribers')",
                CoordinateSystem.NORMALIZED_01: "answer('6 subscribers')",
                CoordinateSystem.NORMALIZED_999: "answer('6 subscribers')",
            },
        ),
    ]
)

# Copyright (c) Meta Platforms, Inc. and affiliates.
SYSTEM_PROMPT = """
You are a helpful GUI agent.
"""

USER_PROMPT_TEMPLATE = """Assist a user by generating actions based on their conversational input and the current screen image.
Available actions (pick one):
{action_descriptions}
Please respond with a single action, with no additional text.
Goal: {goal}. Past actions: {past_actions}. What action should the user take next? """

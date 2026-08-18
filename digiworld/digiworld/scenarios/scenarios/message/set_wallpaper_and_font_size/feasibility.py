"""Feasibility constraints for 'set_wallpaper_and_font_size'.

Requires that the user has a chat_settings row.
"""

from digiworld.scenarios.scenarios.message.shared import HAS_CHAT_SETTINGS

CONSTRAINTS = [HAS_CHAT_SETTINGS]

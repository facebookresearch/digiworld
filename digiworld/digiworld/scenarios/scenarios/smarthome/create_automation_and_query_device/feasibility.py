"""Feasibility constraints for 'Create automation and query device'.

Requires rooms to exist so the device record's room reference is valid.
The target device is injected via additional mockdata.
"""

from digiworld.scenarios.scenarios.smarthome.shared import ROOMS_EXIST

CONSTRAINTS = [ROOMS_EXIST]

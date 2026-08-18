"""Feasibility constraints for 'Edit room and query floor'.

Requires at least one room to exist for the description edit and floor query.
"""

from digiworld.scenarios.scenarios.smarthome.shared import ROOMS_EXIST

CONSTRAINTS = [ROOMS_EXIST]

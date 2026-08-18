"""Feasibility constraints for 'check_in_and_get_status'.

Requires that the user has at least one confirmed booking.
"""

from digiworld.scenarios.scenarios.flightbooking.shared import USER_HAS_CONFIRMED_BOOKINGS

CONSTRAINTS = [USER_HAS_CONFIRMED_BOOKINGS]

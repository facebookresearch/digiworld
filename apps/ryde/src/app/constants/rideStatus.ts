import { colors } from '@andojo/shared-theme'

export enum RideStatus {
  Searching = 'searching',
  Assigned = 'assigned',
  Ongoing = 'ongoing',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export interface RideStatusConfig {
  color: string
  bg: string
  label: string
  icon?: string
}

export const RIDE_STATUS_CONFIG: Record<
  RideStatus | 'default',
  RideStatusConfig
> = {
  [RideStatus.Searching]: {
    color: colors.palette.secondary400,
    bg: colors.palette.secondary100,
    label: 'Searching for Driver',
    icon: 'search-outline',
  },
  [RideStatus.Assigned]: {
    color: colors.palette.secondary400,
    bg: colors.palette.secondary100,
    label: 'Driver Assigned',
    icon: 'person-outline',
  },
  [RideStatus.Ongoing]: {
    color: colors.palette.secondary400,
    bg: colors.palette.secondary100,
    label: 'Ongoing',
    icon: 'car-outline',
  },
  [RideStatus.Completed]: {
    color: colors.palette.success400,
    bg: colors.palette.success100,
    label: 'Completed',
    icon: 'checkmark-circle-outline',
  },
  [RideStatus.Cancelled]: {
    color: colors.palette.angry400,
    bg: colors.palette.angry100,
    label: 'Cancelled',
    icon: 'close-circle-outline',
  },
  default: {
    color: colors.palette.neutral500,
    bg: colors.palette.neutral200,
    label: 'Pending',
    icon: 'help-circle-outline',
  },
}

export const getRideStatusConfig = (status: string): RideStatusConfig => {
  const normalizedStatus = status?.toLowerCase() as RideStatus
  return RIDE_STATUS_CONFIG[normalizedStatus] || RIDE_STATUS_CONFIG.default
}

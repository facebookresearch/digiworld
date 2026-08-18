import type { ThemeColors } from '@andojo/shared-theme'

export enum OrderStatus {
  Pending = 'pending',
  Preparing = 'preparing',
  Assigned = 'assigned',
  OutForDelivery = 'out_for_delivery',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export interface OrderStatusConfig {
  color: string
  bg: string
  label: string
  icon?: string
}

// Factory function that creates the config with provided colors
export const getOrderStatusConfigMap = (
  colors: ThemeColors,
): Record<OrderStatus | 'default', OrderStatusConfig> => ({
  [OrderStatus.Pending]: {
    color: colors.palette.primary400,
    bg: colors.palette.primary100,
    label: 'Pending',
    icon: 'time-outline',
  },
  [OrderStatus.Preparing]: {
    color: colors.palette.secondary400,
    bg: colors.palette.secondary100,
    label: 'Preparing',
    icon: 'restaurant-outline',
  },
  [OrderStatus.Assigned]: {
    color: colors.palette.secondary400,
    bg: colors.palette.secondary100,
    label: 'Assigned',
    icon: 'person-outline',
  },
  [OrderStatus.OutForDelivery]: {
    color: colors.palette.secondary400,
    bg: colors.palette.secondary100,
    label: 'Out for Delivery',
    icon: 'bicycle-outline',
  },
  [OrderStatus.Delivered]: {
    color: colors.palette.success400,
    bg: colors.palette.success100,
    label: 'Delivered',
    icon: 'checkmark-circle-outline',
  },
  [OrderStatus.Cancelled]: {
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
})

export const getOrderStatusConfig = (
  status: string,
  colors: ThemeColors,
): OrderStatusConfig => {
  const config = getOrderStatusConfigMap(colors)
  const normalizedStatus = status?.toLowerCase() as OrderStatus
  return config[normalizedStatus] || config.default
}

import { colors } from '@andojo/shared-theme'

export interface PaymentOption {
  id: string
  icon: string // keyof typeof Ionicons.glyphMap
  label: string
  gradient: string[]
  route: string
}

export interface PromoBanner {
  id: string
  title: string
  description: string
  image: string
  url: string
  backgroundColor: string
}

export const PROMO_BANNERS: PromoBanner[] = [
  {
    id: 'savings',
    title: 'High Yield Savings',
    description: 'Earn up to 4.5% APY on your savings',
    image:
      'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=300',
    url: 'https://example.com/savings',
    backgroundColor: 'rgba(63, 81, 181, 0.05)',
  },
  {
    id: 'credit-card',
    title: 'Premium Credit Card',
    description: '2% cashback on all purchases',
    image:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=300',
    url: 'https://example.com/credit-card',
    backgroundColor: 'rgba(255, 87, 34, 0.05)',
  },
  {
    id: 'investments',
    title: 'Investment Account',
    description: 'Start investing with just $100',
    image:
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=300',
    url: 'https://example.com/invest',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  {
    id: 'insurance',
    title: 'Life Insurance',
    description: "Protect your family's future",
    image:
      'https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&q=80&w=300',
    url: 'https://example.com/insurance',
    backgroundColor: 'rgba(156, 39, 176, 0.05)',
  },
]

export const CREDIT_CARD_BANNERS: PromoBanner[] = [
  {
    id: 'premium-card',
    title: 'Premium Card',
    description: '5% cashback on all purchases',
    image:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=300',
    url: 'https://example.com/premium-card',
    backgroundColor: 'rgba(63, 81, 181, 0.05)',
  },
  {
    id: 'travel-card',
    title: 'Travel Card',
    description: '3x points on travel and dining',
    image:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=300',
    url: 'https://example.com/travel-card',
    backgroundColor: 'rgba(255, 87, 34, 0.05)',
  },
  {
    id: 'student-card',
    title: 'Student Card',
    description: 'Build credit with no annual fee',
    image:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=300',
    url: 'https://example.com/student-card',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  {
    id: 'business-card',
    title: 'Business Card',
    description: 'Earn rewards on business expenses',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=300',
    url: 'https://example.com/business-card',
    backgroundColor: 'rgba(156, 39, 176, 0.05)',
  },
]

export const TRANSACTION_SUMMARY = {
  spent: 2107.8,
  received: 3240.5,
  month: 'July',
  stats: [
    {
      label: 'Deposits',
      amount: 1850.0,
      trend: '+12%',
      color: colors.palette.primary500,
      icon: 'add-circle',
    },
    {
      label: 'Withdrawals',
      amount: 950.0,
      trend: '-5%',
      color: colors.palette.angry500,
      icon: 'remove-circle',
    },
    {
      label: 'Sent',
      amount: 1250.0,
      trend: '+8%',
      color: colors.palette.accent500,
      icon: 'arrow-up-circle',
    },
    {
      label: 'Received',
      amount: 2150.0,
      trend: '+15%',
      color: colors.palette.secondary500,
      icon: 'arrow-down-circle',
    },
  ],
}

export const TRANSACTION_PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3_months', label: 'Last 3 Months' },
] as const

export type TransactionPeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'

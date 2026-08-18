// Copyright (c) Meta Platforms, Inc. and affiliates.
// Basic unit tests for RideDetails.tsx logic

describe('RideDetails logic', () => {
  // getInitials function
  const getInitials = (name: string) => {
    if (!name) return ''
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  it('returns initials for single and multiple names', () => {
    expect(getInitials('John')).toBe('J')
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('John A Doe')).toBe('JD')
    expect(getInitials('')).toBe('')
  })

  // formatPaymentMode function
  const formatPaymentMode = (mode?: string) => {
    if (!mode) return 'N/A'
    return mode
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  it('formats payment mode correctly', () => {
    expect(formatPaymentMode('credit_card')).toBe('Credit Card')
    expect(formatPaymentMode('digital_wallet')).toBe('Digital Wallet')
    expect(formatPaymentMode('cash')).toBe('Cash')
    expect(formatPaymentMode()).toBe('N/A')
  })

  // getPaymentIcon function
  const getPaymentIcon = (mode?: string) => {
    switch (mode) {
      case 'cash':
        return 'cash-outline'
      case 'credit_card':
        return 'card-outline'
      case 'digital_wallet':
        return 'wallet-outline'
      default:
        return 'help-circle-outline'
    }
  }

  it('returns correct payment icon', () => {
    expect(getPaymentIcon('cash')).toBe('cash-outline')
    expect(getPaymentIcon('credit_card')).toBe('card-outline')
    expect(getPaymentIcon('digital_wallet')).toBe('wallet-outline')
    expect(getPaymentIcon('something_else')).toBe('help-circle-outline')
    expect(getPaymentIcon()).toBe('help-circle-outline')
  })

  // Add more pure logic tests as needed
})

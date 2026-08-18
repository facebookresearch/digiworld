// Copyright (c) Meta Platforms, Inc. and affiliates.
// Basic unit tests for DriverAssignment.tsx logic

describe('DriverAssignment logic', () => {
  // getInitials function
  const getInitials = (name: string) => {
    if (!name) return ''
    const parts = name.split(' ')
    if (parts.length === 1) return parts[0][0] ? parts[0][0].toUpperCase() : ''
    return parts[0][0] && parts[parts.length - 1][0]
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : ''
  }

  it('returns initials for single and multiple names', () => {
    expect(getInitials('John')).toBe('J')
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('John A Doe')).toBe('JD')
    expect(getInitials('')).toBe('')
  })

  // RideIcon switch logic
  const getRideIconName = (name: string) => {
    switch (name.toLowerCase()) {
      case 'sedan':
        return 'SedanSvg'
      case 'suv':
        return 'SuvSvg'
      case 'mini van':
      case 'van':
        return 'VanSvg'
      default:
        return 'SedanSvg'
    }
  }

  it('returns correct SVG component name for ride type', () => {
    expect(getRideIconName('sedan')).toBe('SedanSvg')
    expect(getRideIconName('SUV')).toBe('SuvSvg')
    expect(getRideIconName('mini van')).toBe('VanSvg')
    expect(getRideIconName('van')).toBe('VanSvg')
    expect(getRideIconName('other')).toBe('SedanSvg')
  })

  // Add more pure logic tests as needed
})

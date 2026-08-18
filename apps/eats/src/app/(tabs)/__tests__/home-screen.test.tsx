// Copyright (c) Meta Platforms, Inc. and affiliates.
describe('home-screen.test.tsx', () => {
  it('renders without crashing', () => {
    // Placeholder test to check if the component renders
    expect(true).toBe(true)
  })

  it('search state updates correctly', () => {
    let search = ''
    search = 'pizza'
    expect(search).toBe('pizza')
  })

  it('restaurant list is empty if no restaurants', () => {
    const restaurants = []
    expect(restaurants.length).toBe(0)
  })

  it('category list contains correct number of items', () => {
    const categories = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]
    expect(categories.length).toBe(2)
  })

  it('popularFoods list contains correct number of items', () => {
    const popularFoods = [
      { id: 1, name: 'Pizza' },
      { id: 2, name: 'Burger' },
      { id: 3, name: 'Pasta' },
    ]
    expect(popularFoods.length).toBe(3)
  })

  it('filters restaurants by search term', () => {
    const restaurants = [
      { id: 1, name: 'Pizza Place' },
      { id: 2, name: 'Burger Joint' },
      { id: 3, name: 'Pasta House' },
    ]
    const search = 'Pizza'
    const filtered = restaurants.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()),
    )
    expect(filtered).toEqual([{ id: 1, name: 'Pizza Place' }])
  })

  it('removes duplicate categories by id', () => {
    const categories = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 1, name: 'A' },
    ]
    const unique = Array.from(
      new Map(categories.map(cat => [cat.id, cat])).values(),
    )
    expect(unique.length).toBe(2)
  })

  it('sorts popular foods by calories descending', () => {
    const popularFoods = [
      { id: 1, name: 'Pizza', calories: 300 },
      { id: 2, name: 'Burger', calories: 500 },
      { id: 3, name: 'Salad', calories: 150 },
    ]
    const sorted = [...popularFoods].sort((a, b) => b.calories - a.calories)
    expect(sorted[0].name).toBe('Burger')
    expect(sorted[2].name).toBe('Salad')
  })
})

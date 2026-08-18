const mockData = {}

export const MMKV = jest.fn().mockImplementation(() => ({
  set: jest.fn((key, value) => {
    mockData[key] = value
  }),
  getString: jest.fn(key => mockData[key] || null),
  getBoolean: jest.fn(key => mockData[key] === 'true'),
  getNumber: jest.fn(key => parseFloat(mockData[key]) || 0),
  delete: jest.fn(key => {
    delete mockData[key]
  }),
  clearAll: jest.fn(() => {
    Object.keys(mockData).forEach(key => delete mockData[key])
  }),
  getAllKeys: jest.fn(() => Object.keys(mockData)),
}))

// Default export
export default new MMKV()

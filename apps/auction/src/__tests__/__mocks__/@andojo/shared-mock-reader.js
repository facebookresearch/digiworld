// Mock for @andojo/shared-mock-reader
module.exports = {
  createReadJSONFile: jest.fn((bundledMocks = {}) => {
    // Return the mock implementation of readJSONFile
    return jest.fn(async filename => {
      console.log('Mock readJSONFile called with', filename)
      // Simulate reading from bundledMocks or fallback
      return bundledMocks[filename] ?? null
    })
  }),
}

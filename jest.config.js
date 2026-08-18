// Copyright (c) Meta Platforms, Inc. and affiliates.
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  projects: ['<rootDir>/apps/*/jest.config.js'],
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '\\.svg': '<rootDir>/apps/eats/test/__mocks__/svgMock.tsx',
  },
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  collectCoverageFrom: [
    'apps/*/src/**/*.{ts,tsx}',
    '!apps/*/src/**/*.d.ts',
    '!apps/*/src/**/*.stories.{ts,tsx}',
    '!apps/*/src/**/*.test.{ts,tsx}',
    '!apps/*/src/**/index.{ts,tsx}',
  ],
}; 
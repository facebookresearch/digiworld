// Copyright (c) Meta Platforms, Inc. and affiliates.
/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.parking.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@andojo/.*|@gluestack-ui/.*|mobx-react-lite|mobx)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverage: false,
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.parking.ts',
  ],
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },

  reporters: [
    'default',
    // [
    //   './node_modules/jest-html-reporter',
    //   {
    //     pageTitle: 'Test Report',
    //     outputPath: './src/__tests__/reports/test-report.html',
    //   },
    // ],
  ],
}

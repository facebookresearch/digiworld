// Copyright (c) Meta Platforms, Inc. and affiliates.
/* eslint-env node */
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot, {
  // Enable the monorepo support
  projectRoot: __dirname,
  watchFolders: [monorepoRoot],
})

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
})

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Add aliases for better module resolution
config.resolver.alias = {
  ...config.resolver.alias,
  '@': path.resolve(__dirname, 'src'),
}

// Add support for all file types
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'jsx',
  'js',
  'ts',
  'tsx',
  'cjs',
  'json',
  'mjs',
]

config.resolver.enableSymlinks = true

module.exports = config

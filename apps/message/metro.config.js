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

// Add SVG transformer
// Apply SVG transformer config safely
config.transformer.babelTransformerPath = require.resolve(
  'react-native-svg-transformer',
)

const assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg')
const sourceExts = [
  ...config.resolver.sourceExts,
  'svg',
  'jsx',
  'js',
  'ts',
  'tsx',
  'cjs',
  'json',
  'mjs',
]

config.resolver = {
  ...config.resolver,
  assetExts,
  sourceExts,
}

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

// Enable symlinks for monorepo support
config.resolver.enableSymlinks = true

module.exports = config

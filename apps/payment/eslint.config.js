// Copyright (c) Meta Platforms, Inc. and affiliates.
const rootConfig = require('../../eslint.config.js')

module.exports = [
  ...rootConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
]

const { FlatCompat } = require('@eslint/eslintrc')
const { fixupConfigRules } = require('@eslint/compat')
const globals = require('globals')

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
})

module.exports = [
  {
    ignores: [
      '**/*.js',
      '!**/eslint.config.js',
      '**/*.svg',
      '**/*.json',
      '**/*.png',
      '**/node_modules/**',
      '**/coverage/**',
      '**/dist/**',
      '**/build/**',
      '**/android/**',
      '**/ios/**',
      '**/.expo/**',
      '**/.vscode/**',
      '**/scripts/**',
    ],
  },

  ...fixupConfigRules(
    compat.extends(
      'expo',
      'plugin:prettier/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-native/all',
      'standard',
    ),
  ),

  ...fixupConfigRules(compat.plugins('reactotron')),

  {
    languageOptions: {
      globals: {
        ...globals.node,
        __DEV__: 'readonly',
        jasmine: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        jest: 'readonly',
        it: 'readonly',
      },
    },
    settings: {
      react: {
        pragma: 'React',
        version: 'detect',
      },
      'react-native/style-sheet-object-names': [
        'StyleSheet',
        'ViewStyle',
        'TextStyle',
        'ImageStyle',
      ],
      'import/resolver': {
        typescript: {
          project: './tsconfig.base.json',
        },
      },
    },
    rules: {
      'generator-star-spacing': 'off',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'off',
      'react-native/no-single-element-style-arrays': 'warn',
      'react-native/no-raw-text': 'off',
      'react-native/split-platform-components': 'warn',
      'react-native/no-unused-styles': 'warn',
      'react-native/sort-styles': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/no-unescaped-entities': 'off',
      'react/react-in-jsx-scope': 'off',
      // TODO: re-enable when eslint-plugin-react-hooks supports ESLint 9 flat config natively
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^error$',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-object-literal-type-assertion': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-unused-vars': 'off',
      'no-void': ['error', { allowAsStatement: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/order': 'off',
      'import/no-unresolved': 'off',
      'comma-dangle': 'off',
      'multiline-ternary': 'off',
      'no-undef': 'off',
      'no-use-before-define': 'off',
      'no-global-assign': 'off',
      quotes: 'off',
      'space-before-function-paren': 'off',
      'func-call-spacing': 'off',
      'brace-style': 'off',
      indent: 'off',
      'reactotron/no-tron-in-production': 'error',
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          arrowParens: 'avoid',
          bracketSpacing: true,
          printWidth: 80,
          semi: false,
          tabWidth: 2,
          trailingComma: 'all',
          useTabs: false,
          endOfLine: 'lf',
        },
      ],
    },
  },
]

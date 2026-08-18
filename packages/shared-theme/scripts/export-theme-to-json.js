#!/usr/bin/env node
// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * Export Theme to JSON
 *
 * This script helps export existing TypeScript themes to JSON format
 * for runtime configuration.
 *
 * Usage:
 *   node scripts/export-theme-to-json.js <themeName> <mode> [outputPath]
 *
 * Example:
 *   node scripts/export-theme-to-json.js email light ./my-theme.json
 */

const fs = require('fs')
const path = require('path')

const themeName = process.argv[2]
const mode = process.argv[3] || 'light'
const outputPath =
  process.argv[4] ||
  path.join(__dirname, '../config-examples/exported-theme.json')

if (!themeName) {
  console.error(
    'Usage: node export-theme-to-json.js <themeName> <mode> [outputPath]',
  )
  console.error(
    'Example: node export-theme-to-json.js email light ./my-theme.json',
  )
  process.exit(1)
}

const validModes = ['light', 'dark']
if (!validModes.includes(mode)) {
  console.error(`Invalid mode. Must be one of: ${validModes.join(', ')}`)
  process.exit(1)
}

// Import the theme (this is a simplified version - actual implementation would need proper TypeScript compilation)
const themeFilePath = path.join(
  __dirname,
  `../src/themes/${mode}/${themeName}.ts`,
)

if (!fs.existsSync(themeFilePath)) {
  console.error(`Theme file not found: ${themeFilePath}`)
  console.error('Available themes:')
  const lightThemes = fs.readdirSync(
    path.join(__dirname, '../src/themes/light'),
  )
  const darkThemes = fs.readdirSync(path.join(__dirname, '../src/themes/dark'))
  console.error(
    '  Light:',
    lightThemes.map(f => f.replace('.ts', '')).join(', '),
  )
  console.error('  Dark:', darkThemes.map(f => f.replace('.ts', '')).join(', '))
  process.exit(1)
}

console.log(`Exporting ${themeName} theme (${mode} mode) to JSON...`)
console.log(
  `Note: This script creates a template. You'll need to manually fill in color values.`,
)

// Create a template theme configuration
const themeTemplate = {
  name: `${themeName}-${mode}`,
  mode: mode,
  colors: {
    palette: {
      neutral100: '#FFFFFF',
      neutral200: '#F4F2F1',
      neutral300: '#D7CEC9',
      neutral400: '#B6ACA6',
      neutral500: '#978F8A',
      neutral600: '#564E4A',
      neutral700: '#3C3836',
      neutral800: '#191015',
      neutral900: '#000000',
      primary100: '#E6F4EA',
      primary200: '#C6E6D0',
      primary300: '#96D0AD',
      primary400: '#66BA8C',
      primary500: '#2E8B57',
      primary600: '#1B6B3F',
      secondary100: '#DCDDE9',
      secondary200: '#BCC0D6',
      secondary300: '#9196B9',
      secondary400: '#626894',
      secondary500: '#41476E',
      accent100: '#FFEED4',
      accent200: '#FFE1B2',
      accent300: '#FDD495',
      accent400: '#FBC878',
      accent500: '#FFBB50',
      angry100: '#F2D6CD',
      angry200: '#E5AC99',
      angry300: '#D78366',
      angry400: '#C03403',
      angry500: '#C03403',
      success100: '#E6F2E6',
      success200: '#BFDFBF',
      success300: '#80C080',
      success400: '#4DA64D',
      success500: '#1A8C1A',
      overlay20: 'rgba(25, 16, 21, 0.2)',
      overlay50: 'rgba(25, 16, 21, 0.5)',
    },
    semantic: {
      transparent: 'rgba(0, 0, 0, 0)',
      text: '#191015',
      textDim: '#564E4A',
      background: '#F4F2F1',
      border: '#B6ACA6',
      tint: '#2E8B57',
      tintInactive: '#D7CEC9',
      separator: '#D7CEC9',
      error: '#C03403',
      errorBackground: '#F2D6CD',
    },
  },
  typography: {
    primary: {
      light: 'spaceGroteskLight',
      normal: 'spaceGroteskRegular',
      medium: 'spaceGroteskMedium',
      semiBold: 'spaceGroteskSemiBold',
      bold: 'spaceGroteskBold',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  },
  components: {
    button: {
      defaultHeight: 56,
      defaultBorderRadius: 12,
      defaultPaddingHorizontal: 24,
      defaultPaddingVertical: 16,
      fontSize: 16,
      fontWeight: '600',
      primaryBackground: '#2E8B57',
      primaryText: '#FFFFFF',
      secondaryBackground: '#41476E',
      secondaryText: '#FFFFFF',
    },
    input: {
      defaultHeight: 56,
      defaultBorderRadius: 14,
      defaultPaddingHorizontal: 16,
      defaultPaddingVertical: 15,
      fontSize: 16,
      fontWeight: '500',
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(46, 139, 87, 0.2)',
      borderWidth: 1,
      placeholderColor: 'rgba(86, 78, 74, 0.6)',
      textColor: '#191015',
    },
    text: {
      defaultFontSize: 14,
      defaultLineHeight: 20,
      headingFontSize: 32,
      headingLineHeight: 40,
      subheadingFontSize: 20,
      subheadingLineHeight: 28,
    },
    screen: {
      backgroundColor: '#F4F2F1',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
  },
}

// Write to file
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

fs.writeFileSync(outputPath, JSON.stringify(themeTemplate, null, 2))

console.log(`✅ Theme template exported to: ${outputPath}`)
console.log(``)
console.log(`📝 Next steps:`)
console.log(`   1. Open ${outputPath}`)
console.log(`   2. Update the color values to match your ${themeName} theme`)
console.log(`   3. Adjust component styles as needed`)
console.log(`   4. Load the theme in your app using:`)
console.log(``)
console.log(`      import themeConfig from './${path.basename(outputPath)}'`)
console.log(`      const { loadThemeFromConfig } = useTheme()`)
console.log(`      loadThemeFromConfig(themeConfig)`)
console.log(``)

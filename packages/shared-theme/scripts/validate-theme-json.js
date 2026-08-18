#!/usr/bin/env node

/**
 * Validate Theme JSON
 *
 * This script validates a theme configuration JSON file
 * to ensure it has the correct structure.
 *
 * Usage:
 *   node scripts/validate-theme-json.js <jsonFilePath>
 *
 * Example:
 *   node scripts/validate-theme-json.js ./config-examples/theme-light-example.json
 */

const fs = require('fs')
const path = require('path')

const jsonFilePath = process.argv[2]

if (!jsonFilePath) {
  console.error('Usage: node validate-theme-json.js <jsonFilePath>')
  console.error(
    'Example: node validate-theme-json.js ./config-examples/theme-light-example.json',
  )
  process.exit(1)
}

const fullPath = path.resolve(jsonFilePath)

if (!fs.existsSync(fullPath)) {
  console.error(`❌ File not found: ${fullPath}`)
  process.exit(1)
}

console.log(`Validating theme configuration: ${fullPath}`)
console.log('')

let config
try {
  const content = fs.readFileSync(fullPath, 'utf8')
  config = JSON.parse(content)
} catch (error) {
  console.error(`❌ Invalid JSON: ${error.message}`)
  process.exit(1)
}

const errors = []
const warnings = []

// Validate required fields
if (!config.name) {
  errors.push('Missing required field: "name"')
}

if (!config.mode) {
  errors.push('Missing required field: "mode"')
} else if (!['light', 'dark'].includes(config.mode)) {
  errors.push(`Invalid mode: "${config.mode}". Must be "light" or "dark"`)
}

if (!config.colors) {
  errors.push('Missing required field: "colors"')
} else {
  if (!config.colors.palette) {
    errors.push('Missing required field: "colors.palette"')
  } else {
    // Check for recommended palette colors
    const recommendedColors = [
      'neutral100',
      'neutral200',
      'neutral300',
      'neutral400',
      'neutral500',
      'neutral600',
      'neutral700',
      'neutral800',
      'neutral900',
      'primary100',
      'primary200',
      'primary300',
      'primary400',
      'primary500',
      'primary600',
      'secondary100',
      'secondary200',
      'secondary300',
      'secondary400',
      'secondary500',
      'accent100',
      'accent200',
      'accent300',
      'accent400',
      'accent500',
      'angry100',
      'angry200',
      'angry300',
      'angry400',
      'angry500',
      'success100',
      'success200',
      'success300',
      'success400',
      'success500',
      'overlay20',
      'overlay50',
    ]

    const missingColors = recommendedColors.filter(
      color => !config.colors.palette[color],
    )
    if (missingColors.length > 0) {
      warnings.push(
        `Missing recommended palette colors: ${missingColors.join(', ')}`,
      )
    }

    // Validate color formats
    Object.entries(config.colors.palette).forEach(([key, value]) => {
      if (typeof value !== 'string') {
        errors.push(`Invalid color value for "${key}": must be a string`)
      } else if (
        !value.match(/^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\([^)]+\))$/)
      ) {
        warnings.push(`Potentially invalid color format for "${key}": ${value}`)
      }
    })
  }

  if (config.colors.semantic) {
    // Validate semantic colors
    const recommendedSemanticColors = [
      'transparent',
      'text',
      'textDim',
      'background',
      'border',
      'tint',
      'tintInactive',
      'separator',
      'error',
      'errorBackground',
    ]

    const missingSemanticColors = recommendedSemanticColors.filter(
      color => !config.colors.semantic[color],
    )
    if (missingSemanticColors.length > 0) {
      warnings.push(
        `Missing recommended semantic colors: ${missingSemanticColors.join(', ')}`,
      )
    }
  }
}

// Validate typography
if (config.typography) {
  if (config.typography.primary) {
    const requiredWeights = ['normal']
    const missingWeights = requiredWeights.filter(
      weight => !config.typography.primary[weight],
    )
    if (missingWeights.length > 0) {
      warnings.push(
        `Missing required typography weights in primary: ${missingWeights.join(', ')}`,
      )
    }
  }
}

// Validate spacing
if (config.spacing) {
  const recommendedSizes = ['xs', 'sm', 'md', 'lg', 'xl']
  const missingSizes = recommendedSizes.filter(
    size => config.spacing[size] === undefined,
  )
  if (missingSizes.length > 0) {
    warnings.push(
      `Missing recommended spacing sizes: ${missingSizes.join(', ')}`,
    )
  }

  // Check if spacing values are numbers
  Object.entries(config.spacing).forEach(([key, value]) => {
    if (typeof value !== 'number') {
      errors.push(`Invalid spacing value for "${key}": must be a number`)
    }
  })
}

// Validate borderRadius
if (config.borderRadius) {
  Object.entries(config.borderRadius).forEach(([key, value]) => {
    if (typeof value !== 'number') {
      errors.push(`Invalid borderRadius value for "${key}": must be a number`)
    }
  })
}

// Validate shadows
if (config.shadows) {
  Object.entries(config.shadows).forEach(([key, shadow]) => {
    if (!shadow.shadowColor)
      warnings.push(`Shadow "${key}" missing shadowColor`)
    if (!shadow.shadowOffset)
      warnings.push(`Shadow "${key}" missing shadowOffset`)
    if (shadow.shadowOpacity === undefined)
      warnings.push(`Shadow "${key}" missing shadowOpacity`)
    if (!shadow.shadowRadius)
      warnings.push(`Shadow "${key}" missing shadowRadius`)
    if (shadow.elevation === undefined)
      warnings.push(`Shadow "${key}" missing elevation`)
  })
}

// Validate component styles
if (config.components) {
  if (config.components.button) {
    const button = config.components.button
    if (
      button.defaultHeight !== undefined &&
      typeof button.defaultHeight !== 'number'
    ) {
      errors.push('button.defaultHeight must be a number')
    }
    if (button.fontSize !== undefined && typeof button.fontSize !== 'number') {
      errors.push('button.fontSize must be a number')
    }
  }

  if (config.components.input) {
    const input = config.components.input
    if (
      input.defaultHeight !== undefined &&
      typeof input.defaultHeight !== 'number'
    ) {
      errors.push('input.defaultHeight must be a number')
    }
    if (input.fontSize !== undefined && typeof input.fontSize !== 'number') {
      errors.push('input.fontSize must be a number')
    }
  }

  if (config.components.text) {
    const text = config.components.text
    if (
      text.defaultFontSize !== undefined &&
      typeof text.defaultFontSize !== 'number'
    ) {
      errors.push('text.defaultFontSize must be a number')
    }
    if (
      text.headingFontSize !== undefined &&
      typeof text.headingFontSize !== 'number'
    ) {
      errors.push('text.headingFontSize must be a number')
    }
  }
}

// Print results
console.log('─────────────────────────────────────────────────────')
console.log('')

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Theme configuration is valid!')
  console.log('')
  console.log(`Theme: ${config.name}`)
  console.log(`Mode: ${config.mode}`)
  if (config.colors?.palette) {
    console.log(`Palette colors: ${Object.keys(config.colors.palette).length}`)
  }
  if (config.components) {
    console.log(
      `Component overrides: ${Object.keys(config.components).join(', ')}`,
    )
  }
} else {
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} error(s):`)
    errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`)
    })
    console.log('')
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warning(s):`)
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`)
    })
    console.log('')
  }

  if (errors.length > 0) {
    console.log('Please fix the errors before using this theme configuration.')
    process.exit(1)
  } else {
    console.log('Theme is valid but has some warnings. It should still work.')
  }
}

console.log('─────────────────────────────────────────────────────')

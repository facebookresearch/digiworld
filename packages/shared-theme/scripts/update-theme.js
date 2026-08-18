const fs = require('fs')
const path = require('path')

const appName = process.env.APP_NAME || process.argv[2]
const mode = process.env.THEME_MODE || process.argv[3] || 'light'

if (!appName) {
  console.error(
    'Please provide an app name via APP_NAME env var or as a CLI argument.',
  )
  process.exit(1)
}

const validModes = ['light', 'dark']
if (!validModes.includes(mode)) {
  console.error(`Invalid theme mode. Must be one of: ${validModes.join(', ')}`)
  process.exit(1)
}

// Auto-discover valid apps by checking the apps/ directory.
const appsDir = path.join(__dirname, '../../../apps')
const appDir = path.join(appsDir, appName)
if (!fs.existsSync(appDir) || !fs.statSync(appDir).isDirectory()) {
  const available = fs.readdirSync(appsDir).filter(f => {
    try {
      return fs.statSync(path.join(appsDir, f)).isDirectory()
    } catch {
      return false
    }
  })
  console.error(
    `Invalid app name "${appName}". ` +
      `No directory found at apps/${appName}. ` +
      `Available: ${available.join(', ')}`,
  )
  process.exit(1)
}

// ThemeContext.tsx no longer has per-app themes (it uses a single default
// palette that gets overridden at runtime by theme.json from state_data).
// The only build-time knob is CURRENT_MODE.
const themeContextPath = path.join(__dirname, '../src/ThemeContext.tsx')
let content = fs.readFileSync(themeContextPath, 'utf8')

content = content.replace(
  /const CURRENT_MODE: ThemeMode = ['"].*?['"];?/,
  `const CURRENT_MODE: ThemeMode = '${mode}'`,
)

fs.writeFileSync(themeContextPath, content)
console.log(`Updated theme mode to '${mode}' for app '${appName}'`)

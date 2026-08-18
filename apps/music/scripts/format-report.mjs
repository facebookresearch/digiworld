// strip-paths.js
import fs from 'fs'

const reportPath = '../test-report.html'
let html = fs.readFileSync(reportPath, 'utf-8')

// Replace full file paths with just the file name
html = html.replace(
  /(?:\/|\\)[^\/\\]*?(__tests__)[^\/\\]*?\/([^\/\\]+\.test\.[tj]sx?)/g,
  '$2',
)

fs.writeFileSync(reportPath, html)
console.log('✔️ Shortened file names in test report')

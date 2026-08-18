// Copyright (c) Meta Platforms, Inc. and affiliates.
const fs = require('fs-extra')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default

const rootDir = path.resolve(__dirname, '../src/app')
const outputPath = path.resolve(__dirname, '../src/app/i18n/en.mock.ts')

async function runExtraction() {
  const glob = (await import('glob')).glob

  const files = await glob(`${rootDir}/**/*.tsx`)
  const translations = {}

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8')
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    traverse(ast, {
      JSXElement({ node }) {
        if (node.openingElement.name.name === 'Text') {
          const content = node.children
            .map(child => (child.type === 'JSXText' ? child.value.trim() : ''))
            .filter(Boolean)
            .join(' ')
          if (content) {
            const key = generateKeyFromFilePath(file, content)
            translations[key] = content
          }
        }
      },
    })
  }

  fs.ensureFileSync(outputPath)
  fs.writeFileSync(
    outputPath,
    `export const en = ${JSON.stringify(translations, null, 2)}\n`,
    'utf8',
  )

  console.log(
    `✅ Extracted ${Object.keys(translations).length} strings to en.mock.ts`,
  )
}

function generateKeyFromFilePath(filePath, content) {
  const relativePath = path.relative(rootDir, filePath)
  const parts = relativePath.split(path.sep)
  const screenName =
    parts.slice(0, -1).filter(Boolean).join('.').replace(/\[|\]/g, '') ||
    'global'

  const safeKey = content
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '')

  return `${screenName}.${safeKey}`
}

runExtraction().catch(console.error)

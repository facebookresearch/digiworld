import fs from 'fs-extra'
import path from 'path'

const source = path.resolve(__dirname, '../assets/images/web')
const destination = path.resolve(
  __dirname,
  '../android/app/src/main/assets/web',
)

async function copyWebFolder(): Promise<void> {
  try {
    await fs.remove(destination)
    await fs.ensureDir(path.dirname(destination))
    await fs.copy(source, destination)
  } catch (err) {
    console.error('❌ Error copying web folder:', err)
    process.exit(1)
  }
}

copyWebFolder()

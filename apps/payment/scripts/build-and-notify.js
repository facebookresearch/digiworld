const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

function getCommitHistory() {
  try {
    // Get commits that are in current branch but not in main
    const commits = execSync('git log main..HEAD --pretty=format:"- %s"', {
      encoding: 'utf8',
    }).trim()

    // If no commits found (maybe we're on main), get last 10 commits
    if (!commits) {
      console.log('No unique commits found, using recent commits...')
      return execSync('git log --pretty=format:"- %s" --max-count=10', {
        encoding: 'utf8',
      })
    }

    return commits
  } catch (error) {
    console.warn('Failed to get commit history:', error)
    return '- Bug fixes and improvements'
  }
}

async function buildAndSave() {
  try {
    console.log('🏗 Building APK...')
    // Clean previous builds
    if (fs.existsSync('android/app/build')) {
      fs.rmSync('android/app/build', { recursive: true, force: true })
    }

    execSync('npx expo prebuild --platform android --clean', {
      stdio: 'inherit',
    })

    // Determine build configuration based on type
    const releaseType = process.env.BUILD_TYPE || 'debug'
    const buildConfig = {
      alpha: {
        gradleTask: 'assembleDebug',
        apkPath: 'debug/app-debug.apk',
        preRelease: true,
      },
      beta: {
        gradleTask: 'assembleDebug',
        apkPath: 'debug/app-debug.apk',
        preRelease: true,
      },
      rc: {
        gradleTask: 'assembleRelease',
        apkPath: 'release/app-release.apk',
        preRelease: true,
      },
      prod: {
        gradleTask: 'assembleRelease',
        apkPath: 'release/app-release.apk',
        preRelease: false,
      },
    }[releaseType]

    // Build with proper configuration
    execSync(`cd android && ./gradlew ${buildConfig.gradleTask}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        GRADLE_OPTS:
          '-Dorg.gradle.jvmargs=-Xmx2048m -XX:+HeapDumpOnOutOfMemoryError',
        ANDROID_GRADLE_OPTS:
          '-Pandroid.enableR8=true -Pandroid.enableR8.fullMode=true',
      },
    })

    const pkgVersion = require('../package.json').version
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const apkName = `andojo-pay-v${pkgVersion}-${timestamp}.apk`

    // Verify source APK exists
    const sourceApk = path.resolve(
      __dirname,
      `../android/app/build/outputs/apk/${buildConfig.apkPath}`,
    )
    if (!fs.existsSync(sourceApk)) {
      throw new Error(`Source APK not found at: ${sourceApk}`)
    }

    // Create release notes with unmerged commits
    const commitHistory = getCommitHistory()

    const releaseNotes = `## Andojo Pay App v${pkgVersion}

### Build Information
- Version: ${pkgVersion}
- Build Type: ${releaseType}
- Build Date: ${new Date().toLocaleString()}

### What's New
${process.env.RELEASE_NOTES || commitHistory}

### Installation
1. Download the APK
2. Enable "Install from Unknown Sources"
3. Install the APK

### Testing Notes
- Please test all functionality
- Report issues in GitHub Issues`

    // Save release notes to temp file
    const notesFile = path.join(os.tmpdir(), 'release-notes.md')
    fs.writeFileSync(notesFile, releaseNotes)

    // Create version tag based on type
    const shortTimestamp = new Date().toISOString().split('T')[0]
    let releaseTag

    if (releaseType === 'prod') {
      // For prod, check existing releases to increment build number
      try {
        const listCmd = `gh release list --limit 1000`
        const releases = execSync(listCmd, { encoding: 'utf8' })
          .split('\n')
          .filter(line => line.includes(`v${pkgVersion}`))

        // Find highest build number
        const buildNumbers = releases.map(r => {
          const match = r.match(new RegExp(`v${pkgVersion}-build\\.(\\d+)`))
          return match ? parseInt(match[1]) : 0
        })
        const nextBuild = Math.max(0, ...buildNumbers) + 1

        releaseTag = `v${pkgVersion}-build.${nextBuild}`
      } catch (error) {
        console.warn('Failed to get releases, using timestamp:', error)
        releaseTag = `v${pkgVersion}-build.1`
      }
    } else {
      releaseTag = `v${pkgVersion}-${releaseType}-${shortTimestamp}`
    }

    console.log('📝 Creating release:', releaseTag)

    // Create GitHub release
    const releaseCmd = [
      'gh release create',
      `"${releaseTag}"`,
      `"${sourceApk}#${apkName}"`,
      `--title "Andojo Pay ${releaseTag}"`,
      `--notes-file "${notesFile}"`,
      '--target main',
      buildConfig.preRelease ? '--prerelease' : '',
    ]
      .filter(Boolean)
      .join(' ')

    // Execute release command
    execSync(releaseCmd, {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      },
    })

    // Cleanup
    fs.unlinkSync(notesFile)

    console.log('✅ Release created successfully!')
    console.log(`📦 APK: ${apkName}`)
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

buildAndSave()

<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# CI/CD Workflow Overview

This repository uses GitHub Actions for continuous integration and deployment (CI/CD) of multiple React Native apps. The workflow is optimized for parallel builds with comprehensive disk space management to handle building up to 12 apps efficiently.

## Quick Stats

- **Total Apps:** 12 React Native apps
- **Parallel Builds:** Up to 4 simultaneous builds (`max-parallel: 4`)
- **Build Time:** ~60 minutes for all 12 apps (vs ~240 min sequential)
- **Disk Management:** 8+ monitoring checkpoints with aggressive cleanup
- **Partial Success:** Failed builds don't block successful ones
- **Auto-Release:** Successful builds automatically create GitHub releases with APKs

---

## 1. `.github/workflows/main.yml` — Main CI/CD Workflow

### Triggers
- **Automatic:** Runs on every push to the `main` branch
- **Manual:** Can be triggered via `workflow_dispatch` with app selection dropdown

### Workflow Structure

The workflow consists of three main jobs that run sequentially:

#### Job 1: `detect-app` — App Detection
Determines which app(s) to build based on the merged branch name or manual input.

**Branch Naming Conventions:**
- `app-[appname]/feature/...` — builds a single app (e.g., `app-eats/feature/login`)
- `multi/[app1]-[app2]/feature/...` — builds multiple apps (e.g., `multi/eats-payment/task/fix`)
- `multi/all/feature/...` — builds all 12 apps
- `infra/*` — skips app build (infrastructure changes only)

**Supported Apps (12 total):**
`eats`, `music`, `ecommerce`, `email`, `payment`, `ryde`, `video`, `message`, `smarthome`, `flightbooking`, `qwikshop`, `banking`

#### Job 2: `set-matrix` — Matrix Configuration
Converts the detected app(s) into a build matrix for parallel execution:
- Expands `"all"` to all 12 apps
- Creates JSON matrix: `{"app": ["eats", "payment", ...]}`
- Passed to build job for parallel execution

#### Job 3: `build` — Parallel Build Execution
Uses a **matrix strategy** with `max-parallel: 4` to build up to 4 apps simultaneously.

**Key Features:**
- `fail-fast: false` — If one app build fails, other builds continue
- `max-parallel: 4` — Balances speed vs disk space (up to 4 apps build concurrently)
- 60-minute timeout per app build
- Allows partial success — successful builds still produce artifacts even if some fail

**Build Steps (per app):**

1. **Disk Space Monitoring (Initial)**
   - Check disk space BEFORE checkout
   - Log runner info, available space, and disk usage
   - Baseline measurement for tracking space consumption

2. **Repository Checkout**
   - Checkout code with `lfs: false` and `fetch-depth: 1` (shallow clone)
   - Monitor disk space after checkout
   - Log repository size and largest directories

3. **Environment Setup**
   - Setup Node.js 20 with yarn cache
   - Setup JDK 17 (Temurin distribution)
   - Cache Gradle dependencies (wrapper and app-specific)
   - Optional: Pull LFS files (continues on error)

4. **Root Dependencies Installation**
   - Install root dependencies (`yarn install --frozen-lockfile --prefer-offline`)
   - Monitor disk space after installation
   - Log root `node_modules` size

5. **Shared Theme Update**
   - Update shared theme for the app
   - Special handling for `video` and `music` apps (dark theme mode)

6. **App Dependencies Installation**
   - Install app-specific dependencies (`yarn install --frozen-lockfile --prefer-offline`)
   - Monitor disk space after installation
   - Log app `node_modules` size

7. **Pre-Build Cleanup (Critical)**
   - **Remove previous build artifacts** from `android/app/build` directory
   - **Clean app-specific Gradle cache** (`.gradle`)
   - **Delete leftover APK files** from previous runs
   - Monitor disk space before prebuild
   - Log current app directory size

8. **Android Prebuild**
   - Run `expo prebuild:android` to generate native Android project
   - Monitor disk space after prebuild
   - Log Android directory size
   - Special: Copy web assets for `eats` app only

9. **APK Build (Optimized)**
   - Build Android APK with **resource-constrained settings**:
     - `--no-daemon` — Prevents Gradle daemon (saves memory)
     - `--max-workers=2` — Limits parallel Gradle workers
     - `-Xmx2048m` — 2GB max heap memory
     - `-XX:MaxMetaspaceSize=512m` — 512MB metaspace limit
   - Monitor disk space after build
   - Log build directory size and APK size

10. **APK Verification**
    - Verify APK exists at expected path
    - Extract APK size metadata
    - Fail build if APK not found

11. **Artifact Upload**
    - Upload APK as GitHub artifact
    - Artifact name: `apk-{app}-{run_number}`
    - 30-day retention with compression level 6
    - Log artifact details (app name, size, artifact name)

12. **Post-Build Cleanup (Aggressive)**
    - **Remove Android build directory** (~1-4GB per app)
    - **Remove app-specific Gradle cache** (~100-500MB)
    - **Remove app `node_modules`** (~100-700MB per app)
    - Keep root `node_modules` for other parallel builds
    - Monitor final disk space
    - **Disk usage warning** if >90% full
    - Detailed cleanup summary with sizes freed

#### Job 4: `release` — Release Creation
Runs even if some builds fail (`if: always()`):
- **Partial Success Handling:** Only releases apps that successfully built
- Uses `fail-fast: false` — if one release fails, others continue
- Downloads APK artifact for each app (continues on error)
- Checks if artifact exists before creating releases
- Creates GitHub Release with tag: `{app-name}-{run-number}` (only for successful builds)
- Uploads APK to the release (uses `--clobber` to overwrite if exists)
- Fails explicitly if no artifact found for an app (provides clear error message)
- Skips releases for failed builds with clear messaging

---

## Key Features

### 1. **Parallel Build Execution**
- Up to 4 apps build simultaneously (`max-parallel: 4`)
- Each build runs independently in its own matrix job
- `fail-fast: false` — allows partial success (one failure doesn't stop others)
- Significantly reduces total build time for multiple apps

### 2. **Disk Space Management**
The workflow implements comprehensive disk space monitoring and aggressive cleanup:

**Monitoring Checkpoints:**
- Before checkout (baseline)
- After checkout
- After root dependencies
- After app dependencies  
- Before prebuild (after pre-build cleanup)
- After prebuild
- After APK build
- After post-build cleanup

**Pre-Build Cleanup:**
- Removes previous build artifacts from `android/app/build`
- Cleans app-specific Gradle cache
- Deletes leftover APK files

**Post-Build Cleanup (runs even if build fails):**
- Removes Android build directory (~1-4GB per app)
- Removes app-specific Gradle cache (~100-500MB)
- Removes app `node_modules` (~100-700MB)
- Keeps root `node_modules` for parallel builds
- Warns if disk usage >90%

**Resource Constraints:**
- `max-parallel: 4` — Limits concurrent builds to prevent disk exhaustion
- Gradle: `--no-daemon`, `--max-workers=2`, `-Xmx2048m`
- Shallow git clone with `fetch-depth: 1`

### 3. **Gradle Dependency Caching**
- Caches Gradle wrapper and dependencies across builds
- App-specific cache keys based on Gradle files hash
- Fallback cache restoration for faster subsequent builds
- Reduces dependency download time significantly

### 4. **Branch-Based Builds**
- Supports single app builds: `app-[appname]/...`
- Supports multi-app builds: `multi/[app1]-[app2]/...`
- Supports all-app builds: `multi/all/...`
- Validates app names against allowed list (12 apps)
- Skips infrastructure-only changes (`infra/*`)
- Manual dispatch option for on-demand builds

### 5. **Partial Success & Error Handling**
- **Partial Build Success:** `fail-fast: false` allows other builds to continue if one fails
- **Partial Release Success:** Release job runs with `if: always()`, only releases successful builds
- **60-minute timeout** per build to prevent hanging
- Validates branch names and app names during detection
- APK verification step ensures build actually succeeded
- Cleanup runs even if build fails (`if: always()`)
- Clear error messages for invalid configurations
- Artifact existence checks before creating releases
- Graceful artifact download with `continue-on-error: true`
- Clear messaging when releases are skipped due to build failures

---

## How It Works

1. **Trigger:** Workflow starts on push to `main` or manual dispatch
2. **App Detection:** Determines which app(s) to build from merged branch name or manual input
3. **Matrix Setup:** Converts app list into build matrix for parallel execution
4. **Parallel Builds:** Up to 4 apps build simultaneously, each following the same build steps
   - If one build fails, others continue (`fail-fast: false`)
   - Each build has 60-minute timeout
5. **Disk Space Management:** Comprehensive monitoring and cleanup throughout
   - Pre-build: Clean previous artifacts before starting
   - Post-build: Aggressive cleanup to free space (runs even if build fails)
   - Continuous monitoring at 8+ checkpoints
6. **Artifact Upload:** APKs uploaded as GitHub artifacts (only for successful builds)
7. **Release:** GitHub Release created for each successfully built app
   - Runs even if some builds failed (`if: always()`)
   - Only creates releases for apps with artifacts
   - Skips releases for failed builds with clear messaging

---

## Build Time Optimization

- **Parallel Execution:** Up to 4 apps build simultaneously (`max-parallel: 4`) instead of sequentially
- **Partial Success:** Failed builds don't block successful builds from completing
- **Gradle Caching:** Caches Gradle wrapper and dependencies across builds
- **Yarn Caching:** Node.js setup caches yarn dependencies
- **Shallow Clone:** `fetch-depth: 1` reduces checkout time
- **Offline Mode:** Uses `--prefer-offline` for faster dependency installation
- **Resource Constraints:** Optimized Gradle settings prevent memory issues
  - `--no-daemon` — No background daemon
  - `--max-workers=2` — Limited parallelism
  - `-Xmx2048m` — Controlled memory usage
- **Cleanup Strategy:** Prevents disk space issues that would cause build failures
  - Pre-build cleanup removes previous artifacts
  - Post-build cleanup frees space for next parallel build
- **Graceful Release Handling:** Only releases successful builds, doesn't fail entire workflow

---

## Troubleshooting

### Build Fails with "No space left on device"
- **Check disk space logs:** The workflow monitors disk space at 8+ checkpoints
- **Review cleanup logs:** Ensure pre-build and post-build cleanup steps are running
- **Reduce parallel builds:** Lower `max-parallel` from 4 to 2 if needed
- **Check GitHub runner specs:** Free tier runners have ~14GB available space
- **Peak usage:** 4 parallel builds can use 15-20GB at peak (very tight)

**Disk Space Optimization Tips:**
- Each app build needs ~3-5GB during build
- Cleanup frees ~2-4GB per app after build
- With `max-parallel: 4`, ensure cleanup completes before space exhaustion

### One Build Fails, All Releases Fail
- **Fixed:** The workflow now uses `fail-fast: false` and `if: always()` for releases
- Successful builds will still be released even if some builds fail
- Check the release job logs to see which apps were skipped
- Failed apps will show: "❌ Build failed for {app} - no APK to release"

### Build Times Out After 60 Minutes
- Check for Gradle daemon issues (should be disabled with `--no-daemon`)
- Review if build is stuck on dependency resolution
- Check if `--prefer-offline` is causing issues with missing packages

### APK Verification Fails
- Check if Gradle build actually succeeded
- Verify APK path: `android/app/build/outputs/apk/release/app-release.apk`
- Review Gradle build logs for errors

### Invalid Branch Name
- Ensure branch follows the naming conventions listed above
- Valid patterns: `app-[name]/...`, `multi/[app1]-[app2]/...`, `multi/all/...`, `infra/*`
- Allowed apps: eats, music, ecommerce, email, payment, ryde, video, message, smarthome, flightbooking, qwikshop, banking

---

## Disk Space Strategy Deep Dive

### Why Disk Space Management is Critical

GitHub's free tier Ubuntu runners provide ~14GB of available disk space. Building React Native Android apps is disk-intensive:

**Typical Space Consumption Per App:**
- Repository: ~500MB-1GB (shared)
- Root node_modules: ~800MB-1.5GB (shared)
- App node_modules: ~100-700MB (per app)
- Android prebuild output: ~200-500MB (per app)
- Android build artifacts: ~1-4GB (per app)
- Gradle cache: ~100-500MB (per app)

**With `max-parallel: 4` (4 simultaneous builds):**
- Shared: ~2.5GB (repo + root node_modules + global Gradle)
- Per app: ~2.5-5GB × 4 = ~10-20GB
- **Peak usage: 12.5-22.5GB** ❌ Exceeds runner capacity!

### How the Workflow Solves This

**1. Pre-Build Cleanup (Prevents Conflicts)**
- Removes stale build artifacts before starting
- Cleans previous Gradle caches
- Ensures clean slate for each build

**2. Resource Constraints (Reduces Peak Usage)**
- `--max-workers=2` — Limits Gradle parallelism
- `-Xmx2048m` — Caps JVM memory at 2GB
- `--no-daemon` — Prevents background processes
- Result: Builds use less memory and temp space

**3. Post-Build Cleanup (Enables Parallelism)**
- **Runs even if build fails** (`if: always()`)
- Removes build directory (~1-4GB freed)
- Removes app node_modules (~100-700MB freed)
- Removes app Gradle cache (~100-500MB freed)
- **Total freed: ~1.2-5.2GB per app**

**4. Parallel Build Safety**
- With cleanup, 4 parallel builds stay within limits:
  - Build 1 completes → cleanup frees ~3GB
  - Build 2 completes → cleanup frees ~3GB
  - Etc.
- Keeps rolling usage under 14GB threshold

**5. Warning System**
- Monitors disk usage at every step
- Warns if usage exceeds 90%
- Suggests reducing `max-parallel` if needed

### Tuning `max-parallel`

| Setting | Total Time (12 apps) | Peak Disk Usage | Risk | Recommendation |
|---------|---------------------|-----------------|------|----------------|
| 1 | ~240 min | ~5GB | ✅ Safest | Too slow |
| 2 | ~120 min | ~8GB | ✅ Very Safe | Conservative |
| **4** | **~60 min** | **~12-15GB** | ⚠️ **Moderate** | **Current (Balanced)** |
| 6 | ~40 min | ~18-22GB | ❌ High | Likely to fail |
| 12 | ~20 min | ~30-50GB | ❌ Critical | Will fail |

**Current choice (`max-parallel: 4`):**
- ✅ Good balance between speed and safety
- ⚠️ Requires cleanup to work properly
- ⚠️ May hit limits if builds are particularly large
- 💡 Can reduce to `2` if seeing frequent disk errors

---

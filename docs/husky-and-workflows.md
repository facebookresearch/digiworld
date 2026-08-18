# Husky Hooks & GitHub Actions Workflows: Coverage Overview

This document summarizes all the code quality, process, and automation checks enforced by local Husky hooks and remote GitHub Actions workflows in this monorepo.

---

## 1. Husky Hooks (Local Git Hooks)

Husky hooks run locally on developer machines to catch issues early and enforce standards before code is pushed to the repository.

### **a. `.husky/pre-commit`**
- **Checks:**
  - Fails if `package-lock.json` is present (enforces Yarn usage).
  - Runs `yarn lint-staged` to lint and format staged files.

### **b. `.husky/commit-msg`**
- **Checks:**
  - Enforces commit message conventions using `commitlint`.

### **c. `.husky/pre-push`**
- **Checks:**
  - **Branch Naming:** Enforces strict branch naming conventions:
    - `app-[appname]/feature/...`
    - `multi/[app1]-[app2]/feature/...`
    - `multi/all/feature/...`
    - `infra/*`
  - **Dependency Management:** Fails if `package-lock.json` is present (Yarn only).
  - **Main Branch Protection:** Prevents direct pushes to `main` (PRs required).
  - **Test Enforcement:** Runs `yarn test` and blocks push if tests fail.

---

## 2. GitHub Actions Workflows (CI/CD)

Workflows in `.github/workflows/` run on GitHub servers to automate quality checks, builds, and releases.

### **a. `quality-check.yml`**
- **Trigger:** On every pull request.
- **Checks:**
  - Fails if `package-lock.json` is present.
  - Installs dependencies with Yarn.
  - Sets up Python venv and installs requirements for the automation API.
  - Runs `yarn format:check` (formatting), `yarn lint-staged` (linting), and `yarn test` (tests).
  - Enforces branch naming conventions (same as Husky pre-push).

### **b. `main.yml`**
- **Trigger:** On push to `main` and manual dispatch.
- **Jobs:**
  - **App Detection:** Determines which app(s) to build based on branch name or manual input.
  - **Build:** Calls the reusable `build.yml` workflow to build the selected app(s).
  - **Release:** Uploads APKs and code zips as GitHub Release assets.

### **c. `build.yml`**
- **Reusable workflow** for building one or more apps.
- **Steps:**
  - Installs dependencies for selected app(s).
  - Prebuilds Android projects if needed (runs `expo prebuild`).
  - Builds all shared packages.
  - Builds Android APKs for each app.
  - Uploads APKs and code zips as artifacts.

---

## 3. Summary Table

| Stage         | Tool      | What It Checks/Enforces                                                                 |
|---------------|-----------|----------------------------------------------------------------------------------------|
| Pre-commit    | Husky     | Linting, formatting, Yarn enforcement                                                   |
| Commit-msg    | Husky     | Commit message format                                                                  |
| Pre-push      | Husky     | Branch naming, Yarn enforcement, main branch protection, tests                         |
| PR            | GitHub Actions | Linting, formatting, tests, branch naming, Python venv setup                            |
| Push to main  | GitHub Actions | App detection, build, release (APKs, code zips)                                         |
| Build         | GitHub Actions | Dependency install, prebuild, build, artifact upload                                    |

---

## 4. References
- [Project Structure](./project_structure.md)
- [CI/CD Workflow](./ci-cd-workflow.md)
- [Root README](../README.md)

---

**For details on each check or workflow, see the referenced YAML and shell script files in `.github/workflows/` and `.husky/`.** 
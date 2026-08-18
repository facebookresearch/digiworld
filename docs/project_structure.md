# Project Structure: Andojo RNApps Monorepo

This monorepo contains multiple React Native applications, shared packages, and a Python-based automation/API layer for Android device interaction. Below is a high-level overview of the main directories and their purposes.

---

## Root Directories

- **.github/**
  - GitHub Actions workflows for CI/CD automation, selective builds, and releases.
  - See `.github/workflows/` for YAML workflow files.

- **.husky/**
  - Git hooks for pre-commit, pre-push, and commit message checks to enforce code quality and standards.

- **apps/**
  - Contains all first-party React Native applications. Each subfolder is a separate app:
    - **eats/**: Food delivery app (MVP, offline-first)
    - **payment/**: Payment processing app
    - **music/**: Music app (boilerplate, Ignite-based)
    - **email/**: Modern, secure, cross-platform email app
    - **ecommerce/**: Online shopping, cart, and checkout
  - Each app has its own `README.md` and follows a modular structure (see each app's README for details).

- **packages/**
  - Shared code and utilities used by multiple apps. Each subfolder is a package:
    - **shared-theme/**: Common UI components and theming
    - **shared-interaction-tracking/**: Analytics, hooks, and utilities
    - **shared-asset-management/**: Asset handling and management (see its README for usage and API)

- **python-agent-to-app-interaction-api/**
  - Python system for Android device automation, state management, and REST API.
  - Includes:
    - **adb_actions.py**: Core ADB interaction logic
    - **asset_manager.py**: Asset management for Android apps
    - **data_generation_pipeline/**: Data generation for apps (ecommerce, email, payment)
    - **server/**: REST API (Flask-based)
    - **data/**, **backup/**, **categories/**: Supporting data and scripts
    - **README.md**: Full documentation and setup

- **PROJECT_STRUCTURE.md**
  - This file! High-level documentation of the monorepo structure.

---

## CI/CD & Development Workflow

- **CI/CD** is managed via GitHub Actions. Workflows support selective builds based on branch naming conventions or manual triggers. See `.github/workflows/` and `docs/ci-cd-workflow.md` for details.
- **Husky** ensures code quality with pre-commit and pre-push hooks.
- **Shared packages** promote code reuse and consistency across all apps.
- **Python automation** enables advanced testing, state management, and data generation for Android apps.

---

## Getting Started

- See the root `README.md` for setup instructions for both React Native and Python components.
- Each app and package has its own `README.md` for more details.
- For CI/CD and release process, see `.github/workflows/` and `docs/ci-cd-workflow.md`.

---

## Contribution Guidelines

- Use feature branches and follow branch naming conventions for selective builds.
- Place shared logic in `packages/` to avoid duplication.
- Keep app-specific logic within each app's directory.
- Use Husky hooks to catch issues before pushing code.

---

For more information, see the documentation in each directory and the main `README.md` at the root of the repository.

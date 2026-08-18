#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
# Test script to simulate GitHub Actions workflow logic locally

set -e

echo "🧪 Testing GitHub Actions workflow logic locally"
echo "================================================"
echo ""

# Simulate branch name extraction
MERGED_BRANCH="${1:-app-parking/bugfix/buildscript-fix}"
echo "📋 Testing with branch: $MERGED_BRANCH"
echo ""

ALLOWED_APPS="eats music ecommerce email payment ryde video message smarthome flightbooking qwikshop banking transit auction parking all"

if [[ "$MERGED_BRANCH" == app-* ]]; then
  CANDIDATE_APP=$(echo "$MERGED_BRANCH" | sed -E 's|^app-([^/]+)/.*$|\1|')
  echo "✅ Branch matches app-* pattern"
  echo "📦 Extracted app name: $CANDIDATE_APP"
  
  if [[ " $ALLOWED_APPS " =~ " $CANDIDATE_APP " ]]; then
    echo "✅ App name is valid"
    APP_NAME="$CANDIDATE_APP"
    echo "🎯 Final app name: $APP_NAME"
  else
    echo "❌ ERROR: Invalid app name extracted: $CANDIDATE_APP"
    echo "   Allowed apps: $ALLOWED_APPS"
    exit 1
  fi
elif [[ "$MERGED_BRANCH" == multi/all/* ]]; then
  APP_NAME="all"
  echo "✅ Multi-app branch (all apps)"
elif [[ "$MERGED_BRANCH" == multi/* ]]; then
  APPS=$(echo "$MERGED_BRANCH" | sed -E 's|^multi/([^/]+)/.*$|\1|')
  APP_LIST=$(echo "$APPS" | tr '-' ' ')
  ALLOWED_APPS="eats music ecommerce email payment ryde video message smarthome flightbooking qwikshop banking transit auction parking"
  for app in $APP_LIST; do
    if [[ ! " $ALLOWED_APPS " =~ " $app " ]]; then
      echo "❌ ERROR: Invalid app name in multi-app branch: $app"
      exit 1
    fi
  done
  APP_NAME="$APP_LIST"
  echo "✅ Multi-app branch: $APP_NAME"
elif [[ "$MERGED_BRANCH" == infra/* ]]; then
  echo "ℹ️  Infra branch - skipping build"
  exit 0
else
  echo "❌ ERROR: Branch name must follow one of:"
  echo "   - app-[appname]/feature/..."
  echo "   - multi/[app1]-[app2]/feature/..."
  echo "   - multi/all/feature/..."
  exit 1
fi

echo ""
echo "✅ All checks passed!"
echo "📦 App to build: $APP_NAME"
echo ""

# Test theme script only for single app (workflow builds multi-app branches separately in matrix)
if [[ "$APP_NAME" != "all" && "$APP_NAME" != *" "* ]]; then
  echo "🧪 Testing theme update script..."
  if APP_NAME="$APP_NAME" yarn workspace @andojo/shared-theme update-theme > /dev/null 2>&1; then
    echo "✅ Theme update script works"
  else
    echo "❌ Theme update script failed"
    exit 1
  fi
else
  echo "ℹ️  Skipping theme test (multi-app or 'all' - workflow builds separately)"
fi

echo ""
echo "🎉 All tests passed! The workflow should work correctly."


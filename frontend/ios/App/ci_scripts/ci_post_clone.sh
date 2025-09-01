#!/bin/sh

# Xcode Cloud Post-Clone Script for iOS
set -euo pipefail

echo "Starting Xcode Cloud post-clone setup..."

# Navigate to the repository root (from ci_scripts directory)
cd "../../../../"

ROOT_DIR=$(pwd)
IOS_APP_DIR="frontend/ios/App"
FRONTEND_DIR="frontend"

echo "Repository root: ${ROOT_DIR}"

# 1) Install npm dependencies for Capacitor/CocoaPods paths
if [ -f "${FRONTEND_DIR}/package.json" ]; then
  echo "Installing frontend npm deps (npm ci)..."
  (cd "${FRONTEND_DIR}" && npm ci)
else
  echo "⚠️ ${FRONTEND_DIR}/package.json not found; skipping npm install"
fi

# 2) Install CocoaPods and generate Pods if missing
if [ -d "${IOS_APP_DIR}" ]; then
  echo "Running pod install in ${IOS_APP_DIR}..."
  (cd "${IOS_APP_DIR}" && pod install --repo-update)
else
  echo "❌ iOS app directory not found at ${IOS_APP_DIR}"
  exit 1
fi

# 3) Add privacy manifests (idempotent)
if [ -f "${IOS_APP_DIR}/add-privacy-manifests.sh" ]; then
  echo "Adding privacy manifests to frameworks..."
  (cd "${IOS_APP_DIR}" && chmod +x add-privacy-manifests.sh && ./add-privacy-manifests.sh)
fi

echo "Xcode Cloud setup completed successfully!"

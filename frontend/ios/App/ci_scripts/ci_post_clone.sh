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

# 1) Install npm deps if npm is available; otherwise, skip
if command -v npm >/dev/null 2>&1; then
  if [ -f "${FRONTEND_DIR}/package.json" ]; then
    echo "Installing frontend npm deps (npm ci)..."
    (cd "${FRONTEND_DIR}" && npm ci)
  else
    echo "⚠️ ${FRONTEND_DIR}/package.json not found; skipping npm install"
  fi
else
  echo "ℹ️ npm not found on CI image; skipping npm install (Capacitor pods should be vendored via Pods/)"
fi

# 2) Verify Pods exist (expecting Pods checked into repo)
if [ -d "${IOS_APP_DIR}/Pods" ]; then
  echo "✅ Pods directory present."
else
  echo "❌ Pods directory missing at ${IOS_APP_DIR}/Pods. Please commit Pods or enable CocoaPods install in CI."
  exit 1
fi

# 3) Add privacy manifests (idempotent)
if [ -f "${IOS_APP_DIR}/add-privacy-manifests.sh" ]; then
  echo "Adding privacy manifests to frameworks..."
  (cd "${IOS_APP_DIR}" && chmod +x add-privacy-manifests.sh && ./add-privacy-manifests.sh)
fi

echo "Xcode Cloud setup completed successfully!"

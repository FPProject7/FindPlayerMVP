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

# 1) Ensure Node/npm present; install via Homebrew if missing
if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found; installing Node via Homebrew..."
  if command -v brew >/dev/null 2>&1; then
    brew update || true
    if brew list node@18 >/dev/null 2>&1; then
      echo "node@18 already installed"
    else
      brew install node@18
    fi
    NODE_PREFIX=$(brew --prefix node@18)
    export PATH="${NODE_PREFIX}/bin:${PATH}"
    echo "Using Node: $(node -v), npm: $(npm -v)"
  else
    echo "❌ Homebrew not available; cannot install Node."
    exit 1
  fi
else
  echo "Using existing Node: $(node -v), npm: $(npm -v)"
fi

# 2) Install frontend npm dependencies (provides Capacitor pods in node_modules)
if [ -f "${FRONTEND_DIR}/package.json" ]; then
  echo "Installing frontend npm deps (npm ci)..."
  (cd "${FRONTEND_DIR}" && npm ci)
else
  echo "❌ ${FRONTEND_DIR}/package.json not found"
  exit 1
fi

# 3) Install CocoaPods dependencies
if [ -d "${IOS_APP_DIR}" ]; then
  echo "Running pod install in ${IOS_APP_DIR}..."
  (cd "${IOS_APP_DIR}" && pod install --repo-update)
else
  echo "❌ iOS app directory not found at ${IOS_APP_DIR}"
  exit 1
fi

# 4) Add privacy manifests (idempotent)
if [ -f "${IOS_APP_DIR}/add-privacy-manifests.sh" ]; then
  echo "Adding privacy manifests to frameworks..."
  (cd "${IOS_APP_DIR}" && chmod +x add-privacy-manifests.sh && ./add-privacy-manifests.sh)
fi

echo "Xcode Cloud setup completed successfully!"

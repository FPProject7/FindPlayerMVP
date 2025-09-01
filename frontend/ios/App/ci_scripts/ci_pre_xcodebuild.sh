#!/bin/sh

# Xcode Cloud Pre-Xcodebuild Script - ensure Pods are present
set -euo pipefail

echo "Starting bulletproof pre-xcodebuild setup..."

# Navigate to the repository root (from ci_scripts directory)
cd "../../../../"

echo "Current directory: $(pwd)"

IOS_APP_DIR="frontend/ios/App"

if [ ! -d "${IOS_APP_DIR}" ]; then
  echo "❌ iOS app directory not found at ${IOS_APP_DIR}"
  exit 1
fi

cd "${IOS_APP_DIR}"

# Ensure CapacitorPushNotifications xcconfig exists; if not, run pod install
if [ ! -f "Pods/Target Support Files/CapacitorPushNotifications/CapacitorPushNotifications.release.xcconfig" ]; then
  echo "CapacitorPushNotifications xcconfig missing; running pod install..."
  pod install --repo-update
else
  echo "✅ Found CapacitorPushNotifications.release.xcconfig"
fi

# Print a quick tree for diagnostics
ls -la "Pods/Target Support Files/CapacitorPushNotifications/" || true

echo "Pre-xcodebuild setup completed."

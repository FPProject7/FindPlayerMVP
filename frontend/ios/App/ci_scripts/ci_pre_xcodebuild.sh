#!/bin/sh

# Xcode Cloud Pre-Xcodebuild Script - verify Pods exist
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

# Verify CapacitorPushNotifications xcconfig exists (should be created by pod install in post-clone)
if [ -f "Pods/Target Support Files/CapacitorPushNotifications/CapacitorPushNotifications.release.xcconfig" ]; then
  echo "✅ Found CapacitorPushNotifications.release.xcconfig"
else
  echo "❌ Missing CapacitorPushNotifications.release.xcconfig even after post-clone setup."
  echo "Listing Pods/Target Support Files contents for diagnostics:"
  ls -la "Pods/Target Support Files/" || true
  exit 1
fi

echo "Pre-xcodebuild verification completed."

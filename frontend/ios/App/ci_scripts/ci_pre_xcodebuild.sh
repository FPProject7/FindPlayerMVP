#!/bin/sh

# Xcode Cloud Pre-Xcodebuild Script
echo "Starting pre-xcodebuild setup..."

# Navigate to the project root
cd "$CI_WORKSPACE"

# Ensure CapacitorBrowser files are properly generated
echo "Ensuring CapacitorBrowser configuration files exist..."
cd "frontend/ios/App"

# Force regenerate Pods if CapacitorBrowser files are missing
if [ ! -f "Pods/Target Support Files/CapacitorBrowser/CapacitorBrowser.release.xcconfig" ]; then
    echo "CapacitorBrowser files missing, regenerating Pods..."
    pod install --repo-update
fi

# Verify CapacitorBrowser files exist
if [ -f "Pods/Target Support Files/CapacitorBrowser/CapacitorBrowser.release.xcconfig" ]; then
    echo "✅ CapacitorBrowser.release.xcconfig found"
else
    echo "❌ CapacitorBrowser.release.xcconfig still missing"
    exit 1
fi

echo "Pre-xcodebuild setup completed successfully!"

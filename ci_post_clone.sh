#!/bin/sh

# Comprehensive CI Post-Clone Script for Xcode Cloud
echo "Starting comprehensive CI setup..."

# Set up environment variables for Xcode Cloud
export CI=true
export XCODE_CLOUD=true

# Navigate to the project root
cd "$CI_WORKSPACE"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
cd "frontend"
npm ci --prefer-offline --no-audit

# Sync Capacitor and install iOS dependencies
echo "Syncing Capacitor and installing iOS dependencies..."
npx cap sync ios --verbose

# Install Pods with repo update and verbose output
echo "Installing Pods..."
cd "ios/App"
pod install --repo-update --verbose

# Verify CapacitorBrowser files exist
echo "Verifying CapacitorBrowser configuration files..."
if [ -f "Pods/Target Support Files/CapacitorBrowser/CapacitorBrowser.release.xcconfig" ]; then
    echo "✅ CapacitorBrowser.release.xcconfig found"
else
    echo "❌ CapacitorBrowser.release.xcconfig missing - attempting to regenerate..."
    pod install --repo-update
fi

echo "CI setup completed successfully!"
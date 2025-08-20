#!/bin/sh

# Xcode Cloud Pre-Xcodebuild Script
echo "Starting pre-xcodebuild setup..."

# Navigate to the project root
cd "$CI_WORKSPACE"

# Ensure we're in the right directory
echo "Current directory: $(pwd)"

# Install Node.js dependencies if not already done
echo "Installing Node.js dependencies..."
cd "frontend"
npm ci --prefer-offline --no-audit

# Sync Capacitor to ensure all plugins are properly configured
echo "Syncing Capacitor..."
npx cap sync ios --verbose

# Navigate to iOS project
cd "ios/App"

# Clean and regenerate Pods
echo "Cleaning and regenerating Pods..."
rm -rf Pods Podfile.lock
pod install --repo-update --verbose

# Verify CapacitorBrowser files exist
echo "Verifying CapacitorBrowser configuration files..."
if [ ! -f "Pods/Target Support Files/CapacitorBrowser/CapacitorBrowser.release.xcconfig" ]; then
    echo "❌ CapacitorBrowser.release.xcconfig missing"
    echo "Listing Pods directory contents:"
    ls -la "Pods/Target Support Files/" 2>/dev/null || echo "Target Support Files directory not found"
    echo "Listing CapacitorBrowser directory:"
    ls -la "Pods/Target Support Files/CapacitorBrowser/" 2>/dev/null || echo "CapacitorBrowser directory not found"
    exit 1
else
    echo "✅ CapacitorBrowser.release.xcconfig found"
fi

# List all CapacitorBrowser files for verification
echo "CapacitorBrowser files found:"
find "Pods/Target Support Files/CapacitorBrowser/" -name "*.xcconfig" 2>/dev/null || echo "No xcconfig files found"

echo "Pre-xcodebuild setup completed successfully!"

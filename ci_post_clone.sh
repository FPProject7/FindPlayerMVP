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

# Force regenerate CapacitorBrowser files if they're missing
echo "Verifying CapacitorBrowser configuration files..."
if [ ! -f "Pods/Target Support Files/CapacitorBrowser/CapacitorBrowser.release.xcconfig" ]; then
    echo "❌ CapacitorBrowser.release.xcconfig missing - attempting to regenerate..."
    
    # Clean and reinstall
    rm -rf Pods Podfile.lock
    pod install --repo-update --verbose
    
    # Check again
    if [ ! -f "Pods/Target Support Files/CapacitorBrowser/CapacitorBrowser.release.xcconfig" ]; then
        echo "❌ CapacitorBrowser.release.xcconfig still missing after regeneration"
        echo "Listing Pods directory contents:"
        ls -la "Pods/Target Support Files/" || echo "Target Support Files directory not found"
        exit 1
    else
        echo "✅ CapacitorBrowser.release.xcconfig found after regeneration"
    fi
else
    echo "✅ CapacitorBrowser.release.xcconfig found"
fi

# List all CapacitorBrowser files for verification
echo "CapacitorBrowser files found:"
find "Pods/Target Support Files/CapacitorBrowser/" -name "*.xcconfig" 2>/dev/null || echo "No xcconfig files found"

echo "CI setup completed successfully!"
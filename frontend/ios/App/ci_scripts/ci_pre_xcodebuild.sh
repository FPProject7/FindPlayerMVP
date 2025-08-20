#!/bin/sh

# Xcode Cloud Pre-Xcodebuild Script
echo "Starting pre-xcodebuild setup..."

# Navigate to the project root (from ci_scripts directory)
# The script runs from ci_scripts, so we need to go up 4 levels to reach project root
cd "../../../../"

# Ensure we're in the right directory
echo "Current directory: $(pwd)"

# Check if we're in the right place
if [ ! -d "frontend" ]; then
    echo "❌ frontend directory not found in $(pwd)"
    echo "Listing current directory contents:"
    ls -la
    exit 1
fi

# Check if node_modules exists, if not run npm install
echo "Checking if node_modules exists..."
if [ ! -d "frontend/node_modules" ]; then
    echo "node_modules not found, installing dependencies..."
    cd "frontend"
    npm ci --prefer-offline --no-audit
    cd ".."
else
    echo "node_modules found, skipping npm install"
fi

# Sync Capacitor to ensure all plugins are properly configured
echo "Syncing Capacitor..."
cd "frontend"
npx cap sync ios --verbose
cd ".."

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

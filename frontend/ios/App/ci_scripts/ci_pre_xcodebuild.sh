#!/bin/sh

# Xcode Cloud Pre-Xcodebuild Script - BULLETPROOF VERSION
echo "Starting bulletproof pre-xcodebuild setup..."

# Navigate to the project root (from ci_scripts directory)
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

# Navigate to iOS project directory
cd "frontend/ios/App"

# Verify CapacitorBrowser files exist (pre-built locally)
echo "Verifying pre-built CapacitorBrowser configuration files..."
if [ ! -f "Pods/Target Support Files/CapacitorBrowser/CapacitorBrowser.release.xcconfig" ]; then
    echo "❌ CapacitorBrowser.release.xcconfig missing - this should have been pre-built locally"
    echo "Listing Pods directory contents:"
    ls -la "Pods/Target Support Files/" 2>/dev/null || echo "Target Support Files directory not found"
    echo "Listing CapacitorBrowser directory:"
    ls -la "Pods/Target Support Files/CapacitorBrowser/" 2>/dev/null || echo "CapacitorBrowser directory not found"
    exit 1
else
    echo "✅ CapacitorBrowser.release.xcconfig found (pre-built)"
fi

# List all CapacitorBrowser files for verification
echo "CapacitorBrowser files found:"
find "Pods/Target Support Files/CapacitorBrowser/" -name "*.xcconfig" 2>/dev/null || echo "No xcconfig files found"

echo "Bulletproof pre-xcodebuild setup completed successfully!"

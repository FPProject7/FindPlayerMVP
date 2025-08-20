#!/bin/sh

# Xcode Cloud Post-Clone Script for iOS
echo "Starting Xcode Cloud post-clone setup..."

# Verify pre-built dependencies exist
echo "Verifying pre-built dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "❌ node_modules not found - dependencies should be pre-built locally"
    exit 1
fi

if [ ! -d "frontend/ios/App/Pods" ]; then
    echo "❌ Pods directory not found - iOS dependencies should be pre-built locally"
    exit 1
fi

echo "✅ Pre-built dependencies verified"

# Navigate to the project root
cd "$CI_WORKSPACE"

# All dependencies are pre-built locally
echo "All dependencies are pre-built locally - no installation needed"

echo "Xcode Cloud setup completed successfully!"

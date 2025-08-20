#!/bin/sh

# Xcode Cloud Post-Xcodebuild Script
echo "Starting post-xcodebuild cleanup..."

# Navigate to the project root
cd "$CI_WORKSPACE"

echo "Post-xcodebuild cleanup completed successfully!"

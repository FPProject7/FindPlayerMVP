#!/bin/sh

# Xcode Cloud Post-Clone Script for iOS
echo "Starting Xcode Cloud post-clone setup..."

# Navigate to the project root
cd "$CI_WORKSPACE"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
cd "frontend"
npm ci

# Sync Capacitor and install iOS dependencies
echo "Syncing Capacitor and installing iOS dependencies..."
npx cap sync ios

# Install Pods with repo update
echo "Installing Pods..."
cd "ios/App"
pod install --repo-update

echo "Xcode Cloud setup completed successfully!"

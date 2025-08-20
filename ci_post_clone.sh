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

echo "CI setup completed successfully!"
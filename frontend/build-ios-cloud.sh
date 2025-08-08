#!/bin/bash

echo "🚀 Setting up iOS build for Xcode Cloud..."

# Build the web app
echo "📦 Building web assets..."
npm run build

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios

# Clean and reinstall pods
echo "🧹 Cleaning and reinstalling pods..."
cd ios/App
rm -rf Pods Podfile.lock
pod install

echo "✅ iOS setup complete for Xcode Cloud!"
echo "📱 You can now archive in Xcode or trigger Xcode Cloud build"

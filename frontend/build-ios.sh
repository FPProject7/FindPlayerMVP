#!/bin/bash

# Exit on error
set -e

echo "🚀 Building FindPlayer for iOS..."

# 1. Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# 2. Build the web app
echo "🔨 Building web app..."
npm run build

# 3. Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios

# 4. Copy web assets
echo "📁 Copying web assets..."
npx cap copy ios

# 5. Open in Xcode
echo "📱 Opening in Xcode..."
npx cap open ios

echo "✅ iOS build setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. In Xcode, select your target device (iPhone/iPad or Simulator)"
echo "2. Click the Play button to build and run"
echo "3. Test the camera functionality by creating a post"
echo ""
echo "🔧 If you encounter any issues:"
echo "- Clean the build folder in Xcode (Product → Clean Build Folder)"
echo "- Delete derived data (Xcode → Preferences → Locations → Derived Data → Delete)"
echo "- Rebuild the project"

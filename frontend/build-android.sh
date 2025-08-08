#!/bin/bash

echo "🚀 Building FindPlayer Android App..."

# Build the web app
echo "📦 Building web assets..."
npm run build

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync

# Build Android APK
echo "🤖 Building Android APK..."
cd android
./gradlew clean assembleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Android build successful!"
    echo "📱 APK location: app/build/outputs/apk/release/app-release.apk"
    echo "📏 APK size: $(ls -lh app/build/outputs/apk/release/app-release.apk | awk '{print $5}')"
    
    # Copy to frontend directory for easy access
    cp app/build/outputs/apk/release/app-release.apk ../FindPlayer-Android-$(date +%Y%m%d-%H%M%S).apk
    echo "📋 Copied APK to frontend directory"
else
    echo "❌ Android build failed!"
    exit 1
fi

cd ..
echo "🎉 Android build complete!"

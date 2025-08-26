#!/bin/bash

echo "🚀 Building FindPlayer Android App Bundle (AAB)..."

# Build the web app
echo "📦 Building web assets..."
npm run build

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync android

# Build Android AAB
echo "🤖 Building Android App Bundle..."
cd android
./gradlew clean bundleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Android AAB build successful!"
    echo "📱 AAB location: app/build/outputs/bundle/release/app-release.aab"
    echo "📏 AAB size: $(ls -lh app/build/outputs/bundle/release/app-release.aab | awk '{print $5}')"
    
    # Copy to frontend directory for easy access
    cp app/build/outputs/bundle/release/app-release.aab ../FindPlayer-Android-$(date +%Y%m%d-%H%M%S).aab
    echo "📋 Copied AAB to frontend directory"
else
    echo "❌ Android AAB build failed!"
    exit 1
fi

cd ..
echo "🎉 Android AAB build complete!"

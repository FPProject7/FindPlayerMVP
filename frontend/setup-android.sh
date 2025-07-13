#!/bin/bash

# Exit on error
set -e

# 1. Install Capacitor and Android dependencies if not present
echo "Installing Capacitor and Android dependencies..."
npm install --save @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor if not already done
if [ ! -f "capacitor.config.json" ]; then
  echo "Initializing Capacitor..."
  npx cap init findplayer.app com.findplayer.app --web-dir=dist --npm-client=npm
fi

# 3. Add the Android platform if not already present
if [ ! -d "android" ]; then
  echo "Adding Android platform..."
  npx cap add android
fi

# 4. Build the web app and copy to native project
echo "Building web app..."
npm run build
echo "Copying web build to native project..."
npx cap copy android

# 5. Open Android project in Android Studio
echo "Opening Android project in Android Studio..."
npx cap open android

echo "Android setup complete!" 
#!/bin/sh

# Xcode Cloud Post-Clone Script for iOS
echo "Starting Xcode Cloud post-clone setup..."

# Navigate to the project root (from ci_scripts directory)
cd "../../../../"

# Check if we're in Xcode Cloud environment
if [ -n "$CI_XCODE_CLOUD" ] || [ -n "$CI" ]; then
    echo "Running in Xcode Cloud environment"
    
    # Navigate to frontend directory
    cd "frontend"
    
    # Install npm dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing npm dependencies..."
        npm ci
    else
        echo "✅ node_modules found"
    fi
    
    # Build the web assets
    echo "Building web assets..."
    npm run build
    
    # Sync Capacitor iOS project
    echo "Syncing Capacitor iOS project..."
    npx cap sync ios
    
    # Verify CapacitorCordova files exist
    echo "Verifying CapacitorCordova files..."
    if [ ! -f "node_modules/@capacitor/ios/CapacitorCordova/CapacitorCordova/Classes/Public/CDVWebViewProcessPoolFactory.h" ]; then
        echo "❌ CapacitorCordova header file not found"
        echo "Reinstalling Capacitor dependencies..."
        npm install @capacitor/ios@latest
        npx cap sync ios
    else
        echo "✅ CapacitorCordova files verified"
    fi
    
    # Additional verification for Xcode Cloud
    echo "Verifying Capacitor framework files..."
    if [ ! -d "node_modules/@capacitor/ios/CapacitorCordova/CapacitorCordova" ]; then
        echo "❌ CapacitorCordova directory not found"
        echo "Performing full Capacitor reinstall..."
        npm uninstall @capacitor/ios @capacitor/core
        npm install @capacitor/ios@latest @capacitor/core@latest
        npx cap sync ios
    else
        echo "✅ CapacitorCordova directory verified"
    fi
    
    # Navigate back to iOS App directory
    cd "ios/App"
    
    # Install CocoaPods dependencies
    echo "Installing CocoaPods dependencies..."
    pod install
    
    # Build the iOS app using Capacitor
    echo "Building iOS app using Capacitor..."
    cd "../.."
    npx cap build ios
    
else
    # Local development environment
    echo "Running in local development environment"
    
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
    echo "All dependencies are pre-built locally - no installation needed"
fi

echo "Xcode Cloud setup completed successfully!"

#!/bin/bash

# App Icon Generator Script for FindPlayer
# This script generates all required icon sizes for iOS and Android

SOURCE_IMAGE="src/assets/FindPlayerLogo.png"
IOS_OUTPUT_DIR="ios_icons"
ANDROID_OUTPUT_DIR="android_icons"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

echo "🎨 Generating app icons from $SOURCE_IMAGE"
echo ""

# Create output directories
mkdir -p "$IOS_OUTPUT_DIR"
mkdir -p "$ANDROID_OUTPUT_DIR"

echo "📱 Generating iOS App Icons..."

# iOS App Icons (required sizes)
echo "  Generating AppIcon-20@2x.png (40x40)..."
sips -z 40 40 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-20@2x.png"

echo "  Generating AppIcon-20@3x.png (60x60)..."
sips -z 60 60 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-20@3x.png"

echo "  Generating AppIcon-29@2x.png (58x58)..."
sips -z 58 58 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-29@2x.png"

echo "  Generating AppIcon-29@3x.png (87x87)..."
sips -z 87 87 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-29@3x.png"

echo "  Generating AppIcon-40@2x.png (80x80)..."
sips -z 80 80 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-40@2x.png"

echo "  Generating AppIcon-40@3x.png (120x120)..."
sips -z 120 120 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-40@3x.png"

echo "  Generating AppIcon-60@2x.png (120x120)..."
sips -z 120 120 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-60@2x.png"

echo "  Generating AppIcon-60@3x.png (180x180)..."
sips -z 180 180 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-60@3x.png"

echo "  Generating AppIcon-76.png (76x76)..."
sips -z 76 76 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-76.png"

echo "  Generating AppIcon-76@2x.png (152x152)..."
sips -z 152 152 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-76@2x.png"

echo "  Generating AppIcon-83.5@2x.png (167x167)..."
sips -z 167 167 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-83.5@2x.png"

echo "  Generating AppIcon-1024.png (1024x1024)..."
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$IOS_OUTPUT_DIR/AppIcon-1024.png"

echo ""
echo "🤖 Generating Android App Icons..."

# Android App Icons (required sizes)
echo "  Generating mipmap-hdpi/ic_launcher.png (72x72)..."
mkdir -p "$ANDROID_OUTPUT_DIR/mipmap-hdpi"
sips -z 72 72 "$SOURCE_IMAGE" --out "$ANDROID_OUTPUT_DIR/mipmap-hdpi/ic_launcher.png"

echo "  Generating mipmap-mdpi/ic_launcher.png (48x48)..."
mkdir -p "$ANDROID_OUTPUT_DIR/mipmap-mdpi"
sips -z 48 48 "$SOURCE_IMAGE" --out "$ANDROID_OUTPUT_DIR/mipmap-mdpi/ic_launcher.png"

echo "  Generating mipmap-xhdpi/ic_launcher.png (96x96)..."
mkdir -p "$ANDROID_OUTPUT_DIR/mipmap-xhdpi"
sips -z 96 96 "$SOURCE_IMAGE" --out "$ANDROID_OUTPUT_DIR/mipmap-xhdpi/ic_launcher.png"

echo "  Generating mipmap-xxhdpi/ic_launcher.png (144x144)..."
mkdir -p "$ANDROID_OUTPUT_DIR/mipmap-xxhdpi"
sips -z 144 144 "$SOURCE_IMAGE" --out "$ANDROID_OUTPUT_DIR/mipmap-xxhdpi/ic_launcher.png"

echo "  Generating mipmap-xxxhdpi/ic_launcher.png (192x192)..."
mkdir -p "$ANDROID_OUTPUT_DIR/mipmap-xxxhdpi"
sips -z 192 192 "$SOURCE_IMAGE" --out "$ANDROID_OUTPUT_DIR/mipmap-xxxhdpi/ic_launcher.png"

# Android adaptive icons (foreground)
echo "  Generating adaptive icon foreground (108x108)..."
mkdir -p "$ANDROID_OUTPUT_DIR/adaptive"
sips -z 108 108 "$SOURCE_IMAGE" --out "$ANDROID_OUTPUT_DIR/adaptive/ic_launcher_foreground.png"

echo ""
echo "✅ App icons generated successfully!"
echo ""
echo "📁 Generated files:"
echo "  iOS icons: $IOS_OUTPUT_DIR/"
echo "  Android icons: $ANDROID_OUTPUT_DIR/"
echo ""
echo "📋 Next steps:"
echo "  1. Copy iOS icons to: ios/App/App/Assets.xcassets/AppIcon.appiconset/"
echo "  2. Copy Android icons to: android/app/src/main/res/"
echo "  3. Update Contents.json for iOS"
echo "  4. Rebuild your apps" 
#!/bin/bash

# iOS App Icon Generator Script
# Usage: ./generate_ios_icons.sh source_image.png

SOURCE_IMAGE=$1
OUTPUT_DIR="ios_icons"

if [ -z "$SOURCE_IMAGE" ]; then
    echo "Usage: ./generate_ios_icons.sh source_image.png"
    echo "Example: ./generate_ios_icons.sh src/assets/login-logo.jpg"
    exit 1
fi

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image '$SOURCE_IMAGE' not found!"
    exit 1
fi

echo "Generating iOS app icons from: $SOURCE_IMAGE"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Generate each size manually
echo "Generating AppIcon-20@2x.png (40x40)..."
sips -z 40 40 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-20@2x.png"

echo "Generating AppIcon-20@3x.png (60x60)..."
sips -z 60 60 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-20@3x.png"

echo "Generating AppIcon-29@2x.png (58x58)..."
sips -z 58 58 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-29@2x.png"

echo "Generating AppIcon-29@3x.png (87x87)..."
sips -z 87 87 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-29@3x.png"

echo "Generating AppIcon-40@2x.png (80x80)..."
sips -z 80 80 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-40@2x.png"

echo "Generating AppIcon-40@3x.png (120x120)..."
sips -z 120 120 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-40@3x.png"

echo "Generating AppIcon-60@2x.png (120x120)..."
sips -z 120 120 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-60@2x.png"

echo "Generating AppIcon-60@3x.png (180x180)..."
sips -z 180 180 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-60@3x.png"

echo "Generating AppIcon-76.png (76x76)..."
sips -z 76 76 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-76.png"

echo "Generating AppIcon-76@2x.png (152x152)..."
sips -z 152 152 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-76@2x.png"

echo "Generating AppIcon-83.5@2x.png (167x167)..."
sips -z 167 167 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-83.5@2x.png"

echo "Generating AppIcon-1024.png (1024x1024)..."
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/AppIcon-1024.png"

echo "✅ iOS app icons generated in: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. Copy the generated icons to: ios/App/App/Assets.xcassets/AppIcon.appiconset/"
echo "2. Update Contents.json to include all the new icon files"
echo "3. Clean and rebuild your Xcode project" 
#!/bin/sh

# Comprehensive CI Post-Clone Script for Xcode Cloud
echo "Starting comprehensive CI setup..."

# Set up environment variables for Xcode Cloud
export CI=true
export XCODE_CLOUD=true

# Install Node.js if not available
echo "Checking Node.js availability..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing..."
    # Install Node.js using Homebrew (available in Xcode Cloud)
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)" || true
    brew install node@18 || brew install node || echo "Failed to install Node.js via Homebrew"
    
    # Alternative: Download and install Node.js directly
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js directly..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 18
        nvm use 18
    fi
fi

# Verify Node.js and npm are available
echo "Node.js version: $(node --version 2>/dev/null || echo 'NOT FOUND')"
echo "npm version: $(npm --version 2>/dev/null || echo 'NOT FOUND')"

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
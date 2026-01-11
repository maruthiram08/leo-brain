#!/bin/zsh
# Source user profile to find npm/node (NVM, Brew, etc)
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc"
export PATH=$PATH:/opt/homebrew/bin:/usr/local/bin

set -e # Exit immediately if a command exits with a non-zero status.

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Leo Desktop Build & Distribution Process...${NC}"

# Ensure we are in the root or know where desktop-app is
# Assuming script is run from root or scripts/
if [ -d "desktop-app" ]; then
    cd desktop-app
elif [ -d "../desktop-app" ]; then
    cd ../desktop-app
else
    echo "Error: Could not find 'desktop-app' directory."
    exit 1
fi

# 1. Clean
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf out

# 2. Make (Compile & Package)
echo -e "${BLUE}🔨 Compiling and Packaging (npm run make)...${NC}"
npm run make

# 3. Post-Process (Sign & Zip)
echo -e "${BLUE}✍️  Verifying & Signing Application...${NC}"

# Define paths (Adjust version if package.json changes, currently 1.0.0)
# Electron Forge creates a zip by default with the Zip Maker
SOURCE_ZIP="out/make/zip/darwin/arm64/Leo-darwin-arm64-1.0.0.zip"
DIST_DIR="out/release"
mkdir -p $DIST_DIR

if [ ! -f "$SOURCE_ZIP" ]; then
    echo "Error: Build failed. Could not find $SOURCE_ZIP"
    exit 1
fi

# Extract to sign/verify
echo "   Extracting..."
unzip -q -o "$SOURCE_ZIP" -d "$DIST_DIR"

APP_BUNDLE="$DIST_DIR/Leo.app"

# Remove Quarantine Attributes (Fixes "App is damaged" on other Macs)
echo "   Removing quarantine attributes..."
xattr -cr "$APP_BUNDLE"

# Force Re-sign with Ad-Hoc Identity (Fixes TCC Identity mismatch)
echo "   Re-signing with ad-hoc identity..."
codesign --force --deep --sign - "$APP_BUNDLE"

# Verifying
echo "   Verifying signature..."
codesign -dv "$APP_BUNDLE"

# 4. Create Final Zip
FINAL_ZIP_NAME="Leo-Desktop-Installer.zip"
echo -e "${BLUE}📦 Creating Final Distribution Zip: $FINAL_ZIP_NAME${NC}"

cd "$DIST_DIR"
zip -q -r "../$FINAL_ZIP_NAME" Leo.app
cd ../..

echo -e "${GREEN}✅ Build Success!${NC}"
echo -e "${GREEN}📂 Final Installer is ready at: $(pwd)/out/$FINAL_ZIP_NAME${NC}"
echo -e "   (Upload this file to share with users)"

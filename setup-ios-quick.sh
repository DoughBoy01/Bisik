#!/bin/bash
set -e

echo "🚀 Bisik iOS Setup"
echo "=================="
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must be run on macOS"
    exit 1
fi

# Check if in project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from the project root directory"
    exit 1
fi

# Check if ios directory exists but is empty or missing key files
if [ ! -f "ios/Podfile" ] || [ ! -f "ios/Bisik.xcodeproj/project.pbxproj" ]; then
    echo "📱 Generating iOS project structure..."

    # Create temp project
    echo "   Creating temporary React Native project..."
    npx @react-native-community/cli init BisikTemp --version 0.73.2 --skip-install --directory ./temp-rn-project

    # Copy iOS files
    echo "   Copying iOS files..."
    cp -R ./temp-rn-project/ios/* ./ios/ 2>/dev/null || true

    # Navigate to ios directory
    cd ios

    # Rename project files
    echo "   Renaming project files..."
    [ -d "BisikTemp.xcodeproj" ] && mv BisikTemp.xcodeproj Bisik.xcodeproj
    [ -d "BisikTemp" ] && mv BisikTemp Bisik
    [ -d "BisikTemp.xcworkspace" ] && mv BisikTemp.xcworkspace Bisik.xcworkspace
    [ -d "BisikTempTests" ] && mv BisikTempTests BisikTests

    # Update references (macOS sed syntax)
    echo "   Updating project references..."
    find . -type f -name "*.pbxproj" -exec sed -i '' 's/BisikTemp/Bisik/g' {} + 2>/dev/null || true
    find . -type f -name "*.plist" -exec sed -i '' 's/BisikTemp/Bisik/g' {} + 2>/dev/null || true
    find . -type f \( -name "*.h" -o -name "*.m" -o -name "*.mm" \) -exec sed -i '' 's/BisikTemp/Bisik/g' {} + 2>/dev/null || true

    cd ..

    # Clean up
    echo "   Cleaning up..."
    rm -rf ./temp-rn-project

    echo "✅ iOS project structure created"
else
    echo "✅ iOS project structure already exists"
fi

# Install CocoaPods
echo ""
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install --repo-update
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now run the app:"
echo "   npm start          # Start Metro bundler"
echo "   npm run ios        # Run on simulator"
echo ""
echo "   Or open in Xcode:"
echo "   open ios/Bisik.xcworkspace"
echo ""

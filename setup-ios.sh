#!/bin/bash

echo "🚀 Setting up Bisik iOS Project..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install --legacy-peer-deps

# Check if iOS directory is empty
if [ ! -f "ios/Podfile" ]; then
    echo "📱 Generating iOS project structure..."

    # Use npx to run react-native CLI
    npx react-native@0.73.2 init BisikTemp --skip-install

    # Copy the iOS folder from temp project
    if [ -d "BisikTemp/ios" ]; then
        echo "📋 Copying iOS project files..."
        cp -r BisikTemp/ios/* ios/

        # Update project name in iOS files
        echo "🔧 Updating project name..."
        find ios -type f -name "*.pbxproj" -exec sed -i 's/BisikTemp/Bisik/g' {} \;
        find ios -type f -name "*.plist" -exec sed -i 's/BisikTemp/Bisik/g' {} \;
        find ios -type f \( -name "*.h" -o -name "*.m" -o -name "*.mm" \) -exec sed -i 's/BisikTemp/Bisik/g' {} \;

        # Rename directories if needed
        if [ -d "ios/BisikTemp" ]; then
            mv ios/BisikTemp ios/Bisik
        fi
        if [ -d "ios/BisikTemp.xcodeproj" ]; then
            mv ios/BisikTemp.xcodeproj ios/Bisik.xcodeproj
        fi
        if [ -d "ios/BisikTemp.xcworkspace" ]; then
            mv ios/BisikTemp.xcworkspace ios/Bisik.xcworkspace
        fi
        if [ -d "ios/BisikTempTests" ]; then
            mv ios/BisikTempTests ios/BisikTests
        fi

        # Clean up temp project
        rm -rf BisikTemp

        echo "✅ iOS project structure created"
    else
        echo "❌ Failed to generate iOS project"
        exit 1
    fi
fi

# Install CocoaPods dependencies
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install
cd ..

echo "✅ Setup complete!"
echo ""
echo "📱 To run the app:"
echo "   npm start                  # Start Metro bundler"
echo "   npm run ios                # Run on iOS simulator"
echo "   open ios/Bisik.xcworkspace # Open in Xcode"


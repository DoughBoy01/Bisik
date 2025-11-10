# Bisik - macOS Setup Instructions

## Prerequisites
- macOS with Xcode installed
- Node.js 18+ installed
- CocoaPods installed (`sudo gem install cocoapods`)
- React Native CLI (`npm install -g react-native-cli`)

## Quick Setup

Run these commands on your Mac:

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Generate iOS project structure (run this script)
./setup-ios-quick.sh

# 3. Run the app
npm start          # Terminal 1: Metro bundler
npm run ios        # Terminal 2: Launch simulator
```

## Manual Setup (If Script Fails)

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Generate iOS Files
```bash
# Create temp project to get iOS files
npx @react-native-community/cli init BisikTemp --version 0.73.2 --skip-install

# Copy iOS folder
cp -R BisikTemp/ios/* ios/

# Rename project files
cd ios
mv BisikTemp.xcodeproj Bisik.xcodeproj
mv BisikTemp Bisik
mv BisikTempTests BisikTests 2>/dev/null || true

# Update project name in all files (macOS sed syntax)
find . -type f -name "*.pbxproj" -exec sed -i '' 's/BisikTemp/Bisik/g' {} +
find . -type f -name "*.plist" -exec sed -i '' 's/BisikTemp/Bisik/g' {} +
find . -type f \( -name "*.h" -o -name "*.m" -o -name "*.mm" \) -exec sed -i '' 's/BisikTemp/Bisik/g' {} +

cd ..
rm -rf BisikTemp
```

### 3. Install CocoaPods
```bash
cd ios
pod install
cd ..
```

### 4. Run the App
```bash
# Terminal 1
npm start

# Terminal 2
npm run ios
```

## Xcode

After setup, open the project in Xcode:

```bash
open ios/Bisik.xcworkspace
```

**IMPORTANT**: Always open `.xcworkspace`, not `.xcodeproj`

## Troubleshooting

### "No bundle URL present"
Metro bundler isn't running. Run `npm start` first.

### "Command PhaseScriptExecution failed"
Clean and reinstall pods:
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Build errors in Xcode
1. Product → Clean Build Folder
2. Close Xcode
3. Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
4. Reinstall pods
5. Reopen Xcode

## Testing

The app includes:
- ✅ Onboarding flow with permissions
- ✅ Location tracking (background & geofencing)
- ✅ Audio player with CarPlay support
- ✅ Social features with contacts
- ✅ Settings management
- ✅ Platform integration (API ready)

Without backend:
- UI and local features work
- API calls will log errors (expected)
- Voice notes won't download yet

## Next Steps

1. Complete onboarding in the app
2. Grant permissions when prompted
3. Explore settings
4. Build the backend platform to enable full functionality

See `README.md` for backend integration details.

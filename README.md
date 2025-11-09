# Bisik - Personal Voice Note Companion

Bisik is a cross-platform mobile app that acts as a personal companion, delivering AI-generated, curated voice notes to users. These voice notes are triggered dynamically based on user location, schedule, and interests, simulating a friendly tap on the shoulder to share timely and relevant information or reminders.

## Features

- **AI-Generated Voice Notes**: Personalized audio content curated for your interests
- **Location-Based Triggers**: Receive voice notes when entering or exiting specific areas
- **Schedule-Based Triggers**: Set up time-based reminders for voice note delivery
- **Smart Playback**: Automatic earphone detection and adaptive playback
- **Privacy-Focused**: Full control over permissions and data sharing
- **Background Operation**: Efficient background location and scheduling with minimal battery impact

## Tech Stack

- **Framework**: React Native 0.73 + TypeScript
- **Navigation**: React Navigation v6
- **Location & Geofencing**: react-native-background-geolocation
- **Permissions**: react-native-permissions
- **Audio Playback**: react-native-sound
- **Background Tasks**: react-native-background-fetch
- **Notifications**: react-native-push-notification
- **Storage**: @react-native-async-storage/async-storage

## Project Structure

```
Bisik/
├── src/
│   ├── services/           # Core service modules
│   │   ├── PermissionManager.ts
│   │   ├── LocationService.ts
│   │   ├── ScheduleService.ts
│   │   ├── AudioPlayer.ts
│   │   ├── NotificationManager.ts
│   │   └── PreferencesStore.ts
│   ├── screens/           # Screen components
│   │   ├── Onboarding/
│   │   ├── Home/
│   │   ├── Settings/
│   │   └── ScheduleManagement/
│   ├── navigation/        # Navigation configuration
│   ├── components/        # Reusable UI components
│   ├── types/            # TypeScript type definitions
│   ├── constants/        # App constants and configuration
│   └── utils/            # Utility functions
├── android/              # Android native code
├── ios/                  # iOS native code
├── App.tsx              # Main app entry point
└── package.json
```

## Prerequisites

- Node.js >= 18
- npm or yarn
- For iOS development:
  - macOS
  - Xcode 14+
  - CocoaPods
- For Android development:
  - Android Studio
  - JDK 11+
  - Android SDK

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Bisik
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 4. Configure native modules

#### Android

Add the following permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

#### iOS

Add the following keys to `ios/Bisik/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Bisik needs your location to trigger voice notes when you arrive at interesting places.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Bisik needs background location access to trigger voice notes even when the app is closed.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Bisik needs background location access to trigger voice notes even when the app is closed.</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>audio</string>
</array>
```

## Running the App

### iOS

```bash
npm run ios
# or
npx react-native run-ios
```

### Android

```bash
npm run android
# or
npx react-native run-android
```

## Development

### Running the Metro bundler

```bash
npm start
# or
yarn start
```

### Type checking

```bash
npm run typecheck
# or
yarn typecheck
```

### Linting

```bash
npm run lint
# or
yarn lint
```

## Core Services

### PermissionManager

Handles requesting and managing app permissions (location, notifications, contacts).

```typescript
import {PermissionManager} from './src/services';

// Request essential permissions
const results = await PermissionManager.requestEssentialPermissions();

// Check specific permission
const status = await PermissionManager.checkPermission(PermissionType.LOCATION);
```

### LocationService

Manages geofencing and location-based triggers.

```typescript
import {LocationService} from './src/services';

// Initialize and start
await LocationService.initialize();
await LocationService.start();

// Add geofence
await LocationService.addGeofence({
  id: 'geofence_1',
  identifier: 'home',
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 200,
  notifyOnEntry: true,
  notifyOnExit: true,
  enabled: true,
  voiceNoteIds: ['note_1', 'note_2'],
});

// Listen for geofence events
LocationService.onGeofenceEvent(event => {
  console.log(`${event.action} at ${event.identifier}`);
});
```

### ScheduleService

Manages time-based triggers for voice notes.

```typescript
import {ScheduleService} from './src/services';

// Initialize
await ScheduleService.initialize();

// Add scheduled trigger
await ScheduleService.addTrigger({
  id: 'trigger_1',
  voiceNoteId: 'note_1',
  triggerTime: new Date('2024-01-01T09:00:00'),
  repeat: RepeatPattern.DAILY,
  enabled: true,
  daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
});

// Listen for trigger events
ScheduleService.onTrigger(trigger => {
  console.log(`Trigger fired: ${trigger.id}`);
});
```

### AudioPlayer

Manages audio playback with earphone detection.

```typescript
import {AudioPlayer} from './src/services';

// Load and play voice note
await AudioPlayer.load(voiceNote);
await AudioPlayer.play();

// Control playback
await AudioPlayer.pause();
await AudioPlayer.stop();
await AudioPlayer.seek(30); // Seek to 30 seconds

// Listen for state changes
AudioPlayer.onStateChange(state => {
  console.log(`Playback state: ${state.playbackState}`);
  console.log(`Earphones connected: ${state.isEarphonesConnected}`);
});
```

### NotificationManager

Manages local notifications.

```typescript
import {NotificationManager} from './src/services';

// Initialize
await NotificationManager.initialize();

// Show notification
NotificationManager.showNotification({
  id: 'notif_1',
  title: 'New Voice Note',
  message: 'You have a new voice note waiting',
  priority: 'high',
});

// Schedule notification
NotificationManager.scheduleNotification({
  id: 'notif_2',
  title: 'Reminder',
  message: 'Time to listen',
  scheduledTime: new Date('2024-01-01T10:00:00'),
});
```

### PreferencesStore

Manages persistent storage of user preferences and app data.

```typescript
import {PreferencesStore} from './src/services';

// Get user preferences
const preferences = await PreferencesStore.getUserPreferences();

// Update preferences
await PreferencesStore.updateUserPreferences({
  interests: [InterestCategory.TECHNOLOGY, InterestCategory.SCIENCE],
});

// Manage voice notes
await PreferencesStore.addVoiceNote(voiceNote);
const voiceNotes = await PreferencesStore.getVoiceNotes();
```

## Configuration

App configuration can be modified in `src/constants/index.ts`:

- `GEOFENCE_CONFIG`: Geofencing parameters
- `AUDIO_CONFIG`: Audio playback settings
- `NOTIFICATION_CONFIG`: Notification preferences
- `COLORS`: App color palette

## Building for Production

### iOS

1. Open `ios/Bisik.xcworkspace` in Xcode
2. Select your signing team and provisioning profile
3. Archive the app (Product > Archive)
4. Upload to App Store Connect

### Android

1. Generate a signing key:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore bisik-release.keystore -alias bisik -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Build the release APK/AAB:
   ```bash
   cd android
   ./gradlew assembleRelease
   # or for AAB:
   ./gradlew bundleRelease
   ```

3. The output will be in `android/app/build/outputs/`

## Troubleshooting

### Common Issues

**Metro bundler cache issues:**
```bash
npm start -- --reset-cache
```

**iOS pod installation issues:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Android build errors:**
```bash
cd android
./gradlew clean
cd ..
```

**Permission issues:**
- Make sure all required permissions are added to AndroidManifest.xml (Android) and Info.plist (iOS)
- Check that background modes are properly configured for iOS

## Future Enhancements

- [ ] Backend integration for AI voice note generation
- [ ] Cloud sync for voice notes and preferences
- [ ] Social features (sharing voice notes)
- [ ] Analytics and usage insights
- [ ] Voice note categories and filtering
- [ ] Custom geofence creation from the app
- [ ] Integration with calendar apps
- [ ] Offline mode improvements

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@bisik.app

---

**Version**: 0.0.1
**Last Updated**: November 2025

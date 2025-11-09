// Jest setup file
import 'react-native-gesture-handler/jestSetup';

// Mock react-native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock permissions
jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);

// Mock Sound
jest.mock('react-native-sound', () => {
  return jest.fn().mockImplementation(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    release: jest.fn(),
    getDuration: jest.fn(() => 100),
    setVolume: jest.fn(),
    setSpeed: jest.fn(),
    getCurrentTime: jest.fn(cb => cb(0)),
    setCurrentTime: jest.fn(),
  }));
});

// Mock BackgroundGeolocation
jest.mock('react-native-background-geolocation', () => ({
  ready: jest.fn(() => Promise.resolve()),
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  addGeofence: jest.fn(() => Promise.resolve()),
  removeGeofence: jest.fn(() => Promise.resolve()),
  onGeofence: jest.fn(),
  onLocation: jest.fn(),
  getCurrentPosition: jest.fn(() => Promise.resolve({})),
}));

// Mock BackgroundFetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(() => Promise.resolve(0)),
  finish: jest.fn(),
  status: jest.fn(() => Promise.resolve(0)),
  stop: jest.fn(() => Promise.resolve()),
}));

// Mock PushNotification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelLocalNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  createChannel: jest.fn(),
}));

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
  isHeadphonesConnected: jest.fn(() => Promise.resolve(false)),
}));

// Global test timeout
jest.setTimeout(10000);

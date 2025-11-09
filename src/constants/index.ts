/**
 * App-wide constants for Bisik
 */

// App Configuration
export const APP_NAME = 'Bisik';
export const APP_VERSION = '0.0.1';

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: '@bisik:user_preferences',
  VOICE_NOTES: '@bisik:voice_notes',
  GEOFENCES: '@bisik:geofences',
  SCHEDULED_TRIGGERS: '@bisik:scheduled_triggers',
  ONBOARDING_COMPLETED: '@bisik:onboarding_completed',
  PERMISSIONS_REQUESTED: '@bisik:permissions_requested',
} as const;

// Geofencing Configuration
export const GEOFENCE_CONFIG = {
  DEFAULT_RADIUS: 200, // meters
  MIN_RADIUS: 50,
  MAX_RADIUS: 1000,
  DESIRED_ACCURACY: 10, // meters
  DISTANCE_FILTER: 10, // meters
  STOP_TIMEOUT: 5, // minutes
  ACTIVITY_TYPE: 'Other',
} as const;

// Background Task Configuration
export const BACKGROUND_FETCH_CONFIG = {
  MINIMUM_FETCH_INTERVAL: 15, // minutes
  STOP_ON_TERMINATE: false,
  START_ON_BOOT: true,
  ENABLE_HEADLESS: true,
} as const;

// Audio Configuration
export const AUDIO_CONFIG = {
  DEFAULT_VOLUME: 0.8,
  DEFAULT_PLAYBACK_SPEED: 1.0,
  MIN_PLAYBACK_SPEED: 0.5,
  MAX_PLAYBACK_SPEED: 2.0,
  FADE_DURATION: 500, // milliseconds
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  CHANNEL_ID: 'bisik_notifications',
  CHANNEL_NAME: 'Bisik Notifications',
  CHANNEL_DESCRIPTION: 'Notifications for voice note triggers',
  IMPORTANCE: 'high' as const,
  VIBRATION_PATTERN: [0, 250, 250, 250],
  SOUND_NAME: 'default',
} as const;

// Default User Preferences
export const DEFAULT_PREFERENCES = {
  interests: [],
  notificationFrequency: 'medium' as const,
  playbackPreferences: {
    autoPlay: true,
    requireEarphones: false,
    playbackSpeed: AUDIO_CONFIG.DEFAULT_PLAYBACK_SPEED,
    volume: AUDIO_CONFIG.DEFAULT_VOLUME,
  },
  privacySettings: {
    locationTrackingEnabled: false,
    notificationsEnabled: false,
    dataCollectionEnabled: false,
    shareUsageData: false,
  },
};

// Interest Category Display Names
export const INTEREST_DISPLAY_NAMES = {
  news: 'News',
  technology: 'Technology',
  health: 'Health & Wellness',
  entertainment: 'Entertainment',
  education: 'Education',
  sports: 'Sports',
  business: 'Business',
  culture: 'Arts & Culture',
  science: 'Science',
  lifestyle: 'Lifestyle',
  travel: 'Travel',
  food: 'Food & Dining',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  PERMISSION_DENIED: 'Permission was denied. Please enable it in settings.',
  LOCATION_UNAVAILABLE: 'Location services are unavailable.',
  AUDIO_PLAYBACK_FAILED: 'Failed to play audio. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  STORAGE_ERROR: 'Failed to save data. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

// API Configuration (for future backend integration)
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'https://api.bisik.app',
  TIMEOUT: 30000, // milliseconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // milliseconds
} as const;

// Timeouts and Intervals
export const TIMEOUTS = {
  NOTIFICATION_DISPLAY: 5000, // milliseconds
  AUTO_DISMISS: 10000, // milliseconds
  DEBOUNCE_DELAY: 300, // milliseconds
  THROTTLE_DELAY: 1000, // milliseconds
} as const;

// UI Constants
export const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  BOTTOM_TAB_HEIGHT: 60,
  HEADER_HEIGHT: 56,
  CARD_BORDER_RADIUS: 12,
  BUTTON_BORDER_RADIUS: 8,
} as const;

// Color Palette (Material Design inspired)
export const COLORS = {
  primary: '#6200EE',
  primaryDark: '#3700B3',
  primaryLight: '#BB86FC',
  secondary: '#03DAC6',
  secondaryDark: '#018786',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  error: '#B00020',
  onPrimary: '#FFFFFF',
  onSecondary: '#000000',
  onBackground: '#000000',
  onSurface: '#000000',
  onError: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#666666',
  divider: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
} as const;

/**
 * Core type definitions for Bisik app
 */

// Voice Note Types
export interface VoiceNote {
  id: string;
  title: string;
  description?: string;
  audioUrl: string;
  duration: number; // in seconds
  category: InterestCategory;
  tags: string[];
  createdAt: Date;
  triggeredAt?: Date;
  playedAt?: Date;
  isPlayed: boolean;
}

// Interest Categories
export enum InterestCategory {
  NEWS = 'news',
  TECHNOLOGY = 'technology',
  HEALTH = 'health',
  ENTERTAINMENT = 'entertainment',
  EDUCATION = 'education',
  SPORTS = 'sports',
  BUSINESS = 'business',
  CULTURE = 'culture',
  SCIENCE = 'science',
  LIFESTYLE = 'lifestyle',
  TRAVEL = 'travel',
  FOOD = 'food',
}

// Location Trigger Types
export interface GeofenceRegion {
  id: string;
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  notifyOnEntry: boolean;
  notifyOnExit: boolean;
  enabled: boolean;
  voiceNoteIds: string[];
}

export interface GeofenceEvent {
  identifier: string;
  action: 'ENTER' | 'EXIT';
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: Date;
}

// Schedule Types
export interface ScheduledTrigger {
  id: string;
  voiceNoteId: string;
  triggerTime: Date;
  repeat?: RepeatPattern;
  enabled: boolean;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
}

export enum RepeatPattern {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  WEEKDAYS = 'weekdays',
  WEEKENDS = 'weekends',
  CUSTOM = 'custom',
}

// User Preferences
export interface UserPreferences {
  interests: InterestCategory[];
  notificationFrequency: NotificationFrequency;
  playbackPreferences: PlaybackPreferences;
  privacySettings: PrivacySettings;
  carPlayPreferences: CarPlayPreferences;
  socialPreferences: SocialPreferences;
}

export enum NotificationFrequency {
  LOW = 'low', // 1-2 per day
  MEDIUM = 'medium', // 3-5 per day
  HIGH = 'high', // 6+ per day
}

export interface PlaybackPreferences {
  autoPlay: boolean;
  requireEarphones: boolean;
  playbackSpeed: number; // 0.5 - 2.0
  volume: number; // 0 - 1
}

export interface PrivacySettings {
  locationTrackingEnabled: boolean;
  notificationsEnabled: boolean;
  dataCollectionEnabled: boolean;
  shareUsageData: boolean;
}

// Permission Types
export enum PermissionType {
  LOCATION = 'location',
  LOCATION_ALWAYS = 'locationAlways',
  NOTIFICATIONS = 'notifications',
  CONTACTS = 'contacts',
}

export interface PermissionStatus {
  type: PermissionType;
  granted: boolean;
  canAskAgain: boolean;
}

// Audio Player Types
export enum PlaybackState {
  IDLE = 'idle',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}

// CarPlay & Vehicle Types
export enum CarConnectionType {
  NONE = 'none',
  CARPLAY = 'carplay',
  ANDROID_AUTO = 'android_auto',
}

export enum VehicleState {
  UNKNOWN = 'unknown',
  STATIONARY = 'stationary',
  MOVING = 'moving',
}

export interface CarPlayState {
  isConnected: boolean;
  connectionType: CarConnectionType;
  vehicleState: VehicleState;
  speed?: number; // km/h
  lastUpdated: Date;
}

export interface CarPlayPreferences {
  enableCarPlay: boolean;
  autoPlayInCar: boolean;
  playOnlyWhenStationary: boolean;
  enableWhileDriving: boolean;
  maxSpeedForPlayback: number; // km/h - won't play above this speed
}

export interface AudioPlayerState {
  currentVoiceNote: VoiceNote | null;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  isEarphonesConnected: boolean;
  isCarPlayConnected: boolean;
  vehicleState: VehicleState;
}

// Contacts & Social Types
export interface Contact {
  id: string;
  recordID?: string; // Native contact ID
  givenName: string;
  familyName?: string;
  displayName: string;
  phoneNumbers: PhoneNumber[];
  emailAddresses: EmailAddress[];
  thumbnailPath?: string;
  hasBisikApp?: boolean; // Whether contact also uses Bisik
  lastSeen?: Date;
  isFavorite?: boolean;
}

export interface PhoneNumber {
  label: string;
  number: string;
}

export interface EmailAddress {
  label: string;
  email: string;
}

export interface BisikUser {
  id: string;
  contactId: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  lastLocation?: UserLocation;
  currentActivity?: UserActivity;
  lastActive: Date;
  preferences: {
    shareLocation: boolean;
    shareActivity: boolean;
    allowSuggestions: boolean;
  };
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  placeName?: string; // e.g., "Starbucks", "Gym"
  placeType?: PlaceType;
}

export enum PlaceType {
  HOME = 'home',
  WORK = 'work',
  GYM = 'gym',
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  PARK = 'park',
  SHOPPING = 'shopping',
  OTHER = 'other',
}

export enum UserActivity {
  IDLE = 'idle',
  WALKING = 'walking',
  RUNNING = 'running',
  CYCLING = 'cycling',
  DRIVING = 'driving',
  AT_GYM = 'at_gym',
  AT_RESTAURANT = 'at_restaurant',
  AT_CAFE = 'at_cafe',
  SHOPPING = 'shopping',
  WORKING = 'working',
}

export interface SocialSuggestion {
  id: string;
  type: SuggestionType;
  priority: 'low' | 'medium' | 'high';
  user: BisikUser;
  title: string;
  message: string;
  context: SuggestionContext;
  expiresAt: Date;
  createdAt: Date;
  actioned: boolean;
  dismissed: boolean;
}

export enum SuggestionType {
  NEARBY_CONTACT = 'nearby_contact',
  SHARED_ACTIVITY = 'shared_activity',
  MEETUP_OPPORTUNITY = 'meetup_opportunity',
  PLACE_RECOMMENDATION = 'place_recommendation',
  ACTIVITY_INVITE = 'activity_invite',
}

export interface SuggestionContext {
  distance?: number; // meters from user
  placeName?: string;
  placeType?: PlaceType;
  activity?: UserActivity;
  specialOffer?: string; // e.g., "2 for 1 at Starbucks"
  timeLimit?: string; // e.g., "for the next 2 hours"
  sharedInterests?: InterestCategory[];
}

export interface SocialPreferences {
  enableSocialFeatures: boolean;
  shareLocationWithContacts: boolean;
  shareActivityStatus: boolean;
  allowSuggestions: boolean;
  suggestionRadius: number; // meters - how close before suggesting
  allowMessaging: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;
  };
}

// Navigation Types
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Home: undefined;
  Settings: undefined;
  ScheduleManagement: undefined;
  VoiceNoteDetail: {voiceNoteId: string};
};

// API Response Types (for future backend integration)
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Notification Types
export interface LocalNotification {
  id: string;
  title: string;
  message: string;
  data?: any;
  scheduledTime?: Date;
  sound?: string;
  priority?: 'default' | 'high' | 'low';
}

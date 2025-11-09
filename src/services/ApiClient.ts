/**
 * API Client Service
 * Handles all HTTP communication with Bisik backend platform
 */

import axios, {AxiosInstance, AxiosError, AxiosRequestConfig} from 'axios';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {logger} from '../utils';
import {
  VoiceNote,
  UserPreferences,
  SocialSuggestion,
  Location as LocationType,
} from '../types';

const TAG = 'ApiClient';

// TODO: Replace with your actual backend URL
const API_BASE_URL = __DEV__
  ? Platform.OS === 'ios'
    ? 'http://localhost:3000/api'
    : 'http://10.0.2.2:3000/api'
  : 'https://api.bisik.com/api';

interface LocationSyncRequest {
  userId: string;
  locations: Array<{
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    timestamp: string;
  }>;
  preferences: UserPreferences;
  deviceInfo: {
    platform: string;
    version: string;
    appVersion: string;
  };
}

interface LocationSyncResponse {
  newVoiceNotes: VoiceNote[];
  socialSuggestions: SocialSuggestion[];
  nextSyncIn: number; // seconds
  serverTime: string;
}

interface OfferMatchRequest {
  userId: string;
  location: {
    lat: number;
    lng: number;
  };
  interests: string[];
  radius: number; // meters
}

interface OfferMatchResponse {
  offers: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    distance: number;
    priority: number;
    specialOffer?: any;
    validUntil: string;
  }>;
}

class ApiClient {
  private client: AxiosInstance;
  private userId: string | null = null;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      config => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

        logger.debug(TAG, `API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        logger.error(TAG, 'Request interceptor error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      response => {
        logger.debug(TAG, `API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error: AxiosError) => {
        if (error.response) {
          // Server responded with error status
          logger.error(TAG, `API Error ${error.response.status}:`, error.response.data);

          // Handle specific error codes
          if (error.response.status === 401) {
            // Unauthorized - clear auth and retry once
            logger.warn(TAG, 'Unauthorized - clearing auth token');
            this.authToken = null;
            // TODO: Trigger re-authentication flow
          }
        } else if (error.request) {
          // Request made but no response
          logger.error(TAG, 'No response from server:', error.message);
        } else {
          // Error setting up request
          logger.error(TAG, 'Request setup error:', error.message);
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Set user ID for API requests
   */
  setUserId(userId: string): void {
    this.userId = userId;
    logger.info(TAG, `User ID set: ${userId}`);
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    logger.info(TAG, 'Auth token set');
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.authToken = null;
    this.userId = null;
    logger.info(TAG, 'Auth cleared');
  }

  /**
   * Sync location and get new voice notes
   */
  async syncLocation(request: LocationSyncRequest): Promise<LocationSyncResponse> {
    try {
      logger.info(TAG, `Syncing ${request.locations.length} location(s) for user ${request.userId}`);

      const response = await this.client.post<LocationSyncResponse>(
        '/location/sync',
        request,
      );

      logger.info(
        TAG,
        `Sync complete: ${response.data.newVoiceNotes.length} new voice notes, ` +
          `${response.data.socialSuggestions.length} social suggestions`,
      );

      return response.data;
    } catch (error) {
      logger.error(TAG, 'Location sync failed:', error);
      throw error;
    }
  }

  /**
   * Find matching offers based on location and preferences
   */
  async findOffers(request: OfferMatchRequest): Promise<OfferMatchResponse> {
    try {
      logger.info(TAG, `Finding offers for user ${request.userId} within ${request.radius}m`);

      const response = await this.client.post<OfferMatchResponse>(
        '/offers/match',
        request,
      );

      logger.info(TAG, `Found ${response.data.offers.length} matching offers`);
      return response.data;
    } catch (error) {
      logger.error(TAG, 'Offer matching failed:', error);
      throw error;
    }
  }

  /**
   * Request voice note generation for specific offer
   */
  async requestVoiceNote(offerId: string, context: any): Promise<VoiceNote> {
    try {
      logger.info(TAG, `Requesting voice note generation for offer ${offerId}`);

      const response = await this.client.post<VoiceNote>('/voice-notes/generate', {
        userId: this.userId,
        offerId,
        context,
      });

      logger.info(TAG, `Voice note generated: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error(TAG, 'Voice note generation failed:', error);
      throw error;
    }
  }

  /**
   * Mark voice note as played
   */
  async markVoiceNotePlayed(voiceNoteId: string): Promise<void> {
    try {
      await this.client.post(`/voice-notes/${voiceNoteId}/played`, {
        userId: this.userId,
        playedAt: new Date().toISOString(),
      });

      logger.debug(TAG, `Marked voice note ${voiceNoteId} as played`);
    } catch (error) {
      logger.error(TAG, 'Failed to mark voice note as played:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Update user preferences on server
   */
  async updatePreferences(preferences: UserPreferences): Promise<void> {
    try {
      logger.info(TAG, 'Updating user preferences');

      await this.client.put('/users/preferences', {
        userId: this.userId,
        preferences,
      });

      logger.info(TAG, 'Preferences updated successfully');
    } catch (error) {
      logger.error(TAG, 'Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Share location with Bisik contacts (for social features)
   */
  async shareLocation(location: LocationType, activity?: string): Promise<void> {
    try {
      await this.client.post('/social/location', {
        userId: this.userId,
        location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
        },
        activity,
        timestamp: new Date().toISOString(),
      });

      logger.debug(TAG, 'Location shared with contacts');
    } catch (error) {
      logger.error(TAG, 'Failed to share location:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get nearby Bisik contacts
   */
  async getNearbyContacts(radius: number = 500): Promise<any[]> {
    try {
      logger.info(TAG, `Getting nearby contacts within ${radius}m`);

      const response = await this.client.get('/social/nearby', {
        params: {
          userId: this.userId,
          radius,
        },
      });

      logger.info(TAG, `Found ${response.data.contacts?.length || 0} nearby contacts`);
      return response.data.contacts || [];
    } catch (error) {
      logger.error(TAG, 'Failed to get nearby contacts:', error);
      return [];
    }
  }

  /**
   * Request a specific deal code or offer
   */
  async requestDealCode(offerId: string): Promise<{code: string; message: string}> {
    try {
      logger.info(TAG, `Requesting deal code for offer ${offerId}`);

      const response = await this.client.post<{code: string; message: string}>(
        `/offers/${offerId}/claim`,
        {
          userId: this.userId,
          claimedAt: new Date().toISOString(),
        },
      );

      logger.info(TAG, `Deal code received: ${response.data.code}`);
      return response.data;
    } catch (error) {
      logger.error(TAG, 'Failed to request deal code:', error);
      throw error;
    }
  }

  /**
   * Health check - verify API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000,
      });

      const isHealthy = response.status === 200;
      logger.info(TAG, `Health check: ${isHealthy ? 'OK' : 'FAILED'}`);
      return isHealthy;
    } catch (error) {
      logger.error(TAG, 'Health check failed:', error);
      return false;
    }
  }

  /**
   * Get device info for API requests
   */
  async getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      appVersion: DeviceInfo.getVersion(),
      deviceId: await DeviceInfo.getUniqueId(),
      model: DeviceInfo.getModel(),
      brand: DeviceInfo.getBrand(),
    };
  }
}

export default new ApiClient();

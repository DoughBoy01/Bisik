/**
 * Location Sync Service
 * Batches and syncs location updates with backend platform
 */

import {logger} from '../utils';
import {Location} from '../types';
import ApiClient from './ApiClient';
import LocationService from './LocationService';
import PreferencesStore from './PreferencesStore';

const TAG = 'LocationSyncService';

// Sync configuration
const SYNC_CONFIG = {
  BATCH_INTERVAL: 60000, // Sync every 60 seconds
  MIN_DISTANCE_CHANGE: 50, // Only sync if moved 50+ meters
  MAX_BATCH_SIZE: 20, // Max locations per batch
  RETRY_DELAY: 5000, // Retry after 5 seconds on failure
  MAX_RETRIES: 3,
};

interface LocationBatch {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

class LocationSyncService {
  private syncIntervalId: NodeJS.Timeout | null = null;
  private locationBatch: LocationBatch[] = [];
  private lastSyncedLocation: {lat: number; lng: number} | null = null;
  private isSyncing = false;
  private retryCount = 0;
  private userId: string | null = null;

  /**
   * Initialize location sync
   */
  async initialize(userId: string): Promise<void> {
    try {
      logger.info(TAG, 'Initializing location sync service');
      this.userId = userId;

      // Set user ID in API client
      ApiClient.setUserId(userId);

      // Subscribe to location updates
      this.subscribeToLocationUpdates();

      // Start sync timer
      this.startSyncTimer();

      // Do initial sync
      await this.performSync();

      logger.info(TAG, 'Location sync service initialized');
    } catch (error) {
      logger.error(TAG, 'Failed to initialize location sync:', error);
      throw error;
    }
  }

  /**
   * Subscribe to location updates from LocationService
   */
  private subscribeToLocationUpdates(): void {
    LocationService.onLocationUpdate(location => {
      this.addLocationToBatch(location);
    });

    logger.debug(TAG, 'Subscribed to location updates');
  }

  /**
   * Add location to batch for syncing
   */
  private addLocationToBatch(location: Location): void {
    // Check if location has changed significantly
    if (this.lastSyncedLocation) {
      const distance = this.calculateDistance(
        this.lastSyncedLocation.lat,
        this.lastSyncedLocation.lng,
        location.coords.latitude,
        location.coords.longitude,
      );

      if (distance < SYNC_CONFIG.MIN_DISTANCE_CHANGE) {
        logger.debug(TAG, `Location change too small (${distance}m), skipping`);
        return;
      }
    }

    // Add to batch
    const batchLocation: LocationBatch = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed,
      heading: location.coords.heading,
      timestamp: new Date(location.timestamp).toISOString(),
    };

    this.locationBatch.push(batchLocation);
    logger.debug(TAG, `Added location to batch (${this.locationBatch.length}/${SYNC_CONFIG.MAX_BATCH_SIZE})`);

    // If batch is full, sync immediately
    if (this.locationBatch.length >= SYNC_CONFIG.MAX_BATCH_SIZE) {
      logger.info(TAG, 'Batch full, syncing immediately');
      this.performSync();
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Start sync timer
   */
  private startSyncTimer(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    this.syncIntervalId = setInterval(() => {
      this.performSync();
    }, SYNC_CONFIG.BATCH_INTERVAL);

    logger.debug(TAG, `Sync timer started (${SYNC_CONFIG.BATCH_INTERVAL}ms)`);
  }

  /**
   * Stop sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      logger.debug(TAG, 'Sync timer stopped');
    }
  }

  /**
   * Perform sync with backend
   */
  private async performSync(): Promise<void> {
    // Don't sync if already syncing
    if (this.isSyncing) {
      logger.debug(TAG, 'Sync already in progress, skipping');
      return;
    }

    // Don't sync if no locations in batch
    if (this.locationBatch.length === 0) {
      logger.debug(TAG, 'No locations to sync');
      return;
    }

    this.isSyncing = true;

    try {
      logger.info(TAG, `Syncing ${this.locationBatch.length} location(s) with backend`);

      // Get user preferences
      const preferences = await PreferencesStore.getUserPreferences();

      // Get device info
      const deviceInfo = await ApiClient.getDeviceInfo();

      // Send to backend
      const response = await ApiClient.syncLocation({
        userId: this.userId!,
        locations: this.locationBatch,
        preferences,
        deviceInfo,
      });

      // Process response - new voice notes
      if (response.newVoiceNotes.length > 0) {
        logger.info(TAG, `Received ${response.newVoiceNotes.length} new voice notes`);
        await this.handleNewVoiceNotes(response.newVoiceNotes);
      }

      // Process response - social suggestions
      if (response.socialSuggestions.length > 0) {
        logger.info(TAG, `Received ${response.socialSuggestions.length} social suggestions`);
        await this.handleSocialSuggestions(response.socialSuggestions);
      }

      // Update last synced location
      if (this.locationBatch.length > 0) {
        const lastLocation = this.locationBatch[this.locationBatch.length - 1];
        this.lastSyncedLocation = {
          lat: lastLocation.lat,
          lng: lastLocation.lng,
        };
      }

      // Clear batch
      this.locationBatch = [];
      this.retryCount = 0;

      logger.info(TAG, 'Sync completed successfully');
    } catch (error) {
      logger.error(TAG, 'Sync failed:', error);

      // Retry logic
      if (this.retryCount < SYNC_CONFIG.MAX_RETRIES) {
        this.retryCount++;
        logger.warn(TAG, `Retrying sync in ${SYNC_CONFIG.RETRY_DELAY}ms (attempt ${this.retryCount}/${SYNC_CONFIG.MAX_RETRIES})`);

        setTimeout(() => {
          this.performSync();
        }, SYNC_CONFIG.RETRY_DELAY);
      } else {
        logger.error(TAG, 'Max retries reached, clearing batch');
        this.locationBatch = [];
        this.retryCount = 0;
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Handle new voice notes from backend
   */
  private async handleNewVoiceNotes(voiceNotes: any[]): Promise<void> {
    try {
      // Store voice notes locally
      for (const voiceNote of voiceNotes) {
        await PreferencesStore.addVoiceNote(voiceNote);
        logger.debug(TAG, `Stored voice note: ${voiceNote.id}`);
      }

      // TODO: Trigger notification or auto-play based on preferences
      // This will be handled by VoiceNoteManager
    } catch (error) {
      logger.error(TAG, 'Error handling new voice notes:', error);
    }
  }

  /**
   * Handle social suggestions from backend
   */
  private async handleSocialSuggestions(suggestions: any[]): Promise<void> {
    try {
      // Store suggestions locally
      await PreferencesStore.setSocialSuggestions(suggestions);
      logger.debug(TAG, `Stored ${suggestions.length} social suggestions`);

      // TODO: Trigger notification based on preferences
    } catch (error) {
      logger.error(TAG, 'Error handling social suggestions:', error);
    }
  }

  /**
   * Force sync immediately
   */
  async forceSyn(): Promise<void> {
    logger.info(TAG, 'Force sync requested');
    await this.performSync();
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      batchSize: this.locationBatch.length,
      lastSyncedLocation: this.lastSyncedLocation,
      retryCount: this.retryCount,
    };
  }

  /**
   * Stop location sync
   */
  stop(): void {
    logger.info(TAG, 'Stopping location sync service');
    this.stopSyncTimer();
    this.locationBatch = [];
    this.isSyncing = false;
  }

  /**
   * Clean up
   */
  async cleanup(): Promise<void> {
    logger.info(TAG, 'Cleaning up location sync service');
    this.stop();
    this.userId = null;
    this.lastSyncedLocation = null;
  }
}

export default new LocationSyncService();

/**
 * Location Service
 * Manages geofencing and location-based triggers
 */

import BackgroundGeolocation, {
  Location,
  GeofenceEvent as BGGeofenceEvent,
  State,
  Geofence,
} from 'react-native-background-geolocation';
import {GeofenceRegion, GeofenceEvent} from '../types';
import {GEOFENCE_CONFIG} from '../constants';
import {logger} from '../utils';

const TAG = 'LocationService';

type GeofenceEventCallback = (event: GeofenceEvent) => void;
type LocationUpdateCallback = (location: Location) => void;

class LocationService {
  private isInitialized = false;
  private geofenceCallbacks: GeofenceEventCallback[] = [];
  private locationCallbacks: LocationUpdateCallback[] = [];

  /**
   * Initialize the background geolocation service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn(TAG, 'LocationService already initialized');
      return;
    }

    try {
      logger.info(TAG, 'Initializing LocationService');

      // Configure BackgroundGeolocation
      await BackgroundGeolocation.ready({
        // Geolocation Config
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        distanceFilter: GEOFENCE_CONFIG.DISTANCE_FILTER,
        // Activity Recognition
        stopTimeout: GEOFENCE_CONFIG.STOP_TIMEOUT,
        // Application config
        debug: __DEV__, // Enable debug sounds and notifications in development
        logLevel: __DEV__
          ? BackgroundGeolocation.LOG_LEVEL_VERBOSE
          : BackgroundGeolocation.LOG_LEVEL_OFF,
        stopOnTerminate: false,
        startOnBoot: true,
        // Geofencing
        geofenceProximityRadius: GEOFENCE_CONFIG.DEFAULT_RADIUS,
        // iOS specific
        preventSuspend: true,
        pausesLocationUpdatesAutomatically: false,
        locationAuthorizationRequest: 'Always',
        backgroundPermissionRationale: {
          title: 'Allow Bisik to access this device\'s location in the background?',
          message:
            'Bisik needs background location access to trigger voice notes when you arrive at interesting places.',
          positiveAction: 'Change to "Always allow"',
          negativeAction: 'Cancel',
        },
        // Android specific
        notification: {
          title: 'Bisik is running',
          text: 'Listening for location triggers',
        },
      });

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info(TAG, 'LocationService initialized successfully');
    } catch (error) {
      logger.error(TAG, 'Failed to initialize LocationService:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for geofence and location events
   */
  private setupEventListeners(): void {
    // Listen for geofence events
    BackgroundGeolocation.onGeofence(this.handleGeofenceEvent.bind(this));

    // Listen for location updates
    BackgroundGeolocation.onLocation(this.handleLocationUpdate.bind(this), error => {
      logger.error(TAG, 'Location error:', error);
    });

    // Listen for motion change events
    BackgroundGeolocation.onMotionChange(event => {
      logger.debug(TAG, 'Motion change event:', event);
    });

    // Listen for provider change events
    BackgroundGeolocation.onProviderChange(event => {
      logger.info(TAG, 'Provider change event:', event);
    });

    logger.debug(TAG, 'Event listeners set up');
  }

  /**
   * Handle geofence events
   */
  private handleGeofenceEvent(event: BGGeofenceEvent): void {
    logger.info(TAG, 'Geofence event:', event);

    const geofenceEvent: GeofenceEvent = {
      identifier: event.identifier,
      action: event.action as 'ENTER' | 'EXIT',
      location: {
        latitude: event.location.coords.latitude,
        longitude: event.location.coords.longitude,
        accuracy: event.location.coords.accuracy,
      },
      timestamp: new Date(event.location.timestamp),
    };

    // Notify all callbacks
    this.geofenceCallbacks.forEach(callback => {
      try {
        callback(geofenceEvent);
      } catch (error) {
        logger.error(TAG, 'Error in geofence callback:', error);
      }
    });
  }

  /**
   * Handle location updates
   */
  private handleLocationUpdate(location: Location): void {
    logger.debug(TAG, 'Location update:', location);

    // Notify all callbacks
    this.locationCallbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        logger.error(TAG, 'Error in location callback:', error);
      }
    });
  }

  /**
   * Start tracking location
   */
  async start(): Promise<void> {
    try {
      logger.info(TAG, 'Starting location tracking');
      const state = await BackgroundGeolocation.start();
      logger.info(TAG, 'Location tracking started:', state);
    } catch (error) {
      logger.error(TAG, 'Failed to start location tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking location
   */
  async stop(): Promise<void> {
    try {
      logger.info(TAG, 'Stopping location tracking');
      const state = await BackgroundGeolocation.stop();
      logger.info(TAG, 'Location tracking stopped:', state);
    } catch (error) {
      logger.error(TAG, 'Failed to stop location tracking:', error);
      throw error;
    }
  }

  /**
   * Get current location tracking state
   */
  async getState(): Promise<State> {
    return await BackgroundGeolocation.getState();
  }

  /**
   * Add a geofence
   */
  async addGeofence(region: GeofenceRegion): Promise<void> {
    try {
      logger.info(TAG, `Adding geofence: ${region.identifier}`);

      const geofence: Geofence = {
        identifier: region.identifier,
        latitude: region.latitude,
        longitude: region.longitude,
        radius: region.radius,
        notifyOnEntry: region.notifyOnEntry,
        notifyOnExit: region.notifyOnExit,
        notifyOnDwell: false,
      };

      await BackgroundGeolocation.addGeofence(geofence);
      logger.info(TAG, `Geofence added successfully: ${region.identifier}`);
    } catch (error) {
      logger.error(TAG, `Failed to add geofence ${region.identifier}:`, error);
      throw error;
    }
  }

  /**
   * Add multiple geofences
   */
  async addGeofences(regions: GeofenceRegion[]): Promise<void> {
    try {
      logger.info(TAG, `Adding ${regions.length} geofences`);

      const geofences: Geofence[] = regions.map(region => ({
        identifier: region.identifier,
        latitude: region.latitude,
        longitude: region.longitude,
        radius: region.radius,
        notifyOnEntry: region.notifyOnEntry,
        notifyOnExit: region.notifyOnExit,
        notifyOnDwell: false,
      }));

      await BackgroundGeolocation.addGeofences(geofences);
      logger.info(TAG, `${regions.length} geofences added successfully`);
    } catch (error) {
      logger.error(TAG, 'Failed to add geofences:', error);
      throw error;
    }
  }

  /**
   * Remove a geofence
   */
  async removeGeofence(identifier: string): Promise<void> {
    try {
      logger.info(TAG, `Removing geofence: ${identifier}`);
      await BackgroundGeolocation.removeGeofence(identifier);
      logger.info(TAG, `Geofence removed successfully: ${identifier}`);
    } catch (error) {
      logger.error(TAG, `Failed to remove geofence ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Remove all geofences
   */
  async removeAllGeofences(): Promise<void> {
    try {
      logger.info(TAG, 'Removing all geofences');
      await BackgroundGeolocation.removeGeofences();
      logger.info(TAG, 'All geofences removed successfully');
    } catch (error) {
      logger.error(TAG, 'Failed to remove all geofences:', error);
      throw error;
    }
  }

  /**
   * Get all active geofences
   */
  async getGeofences(): Promise<Geofence[]> {
    try {
      const geofences = await BackgroundGeolocation.getGeofences();
      logger.debug(TAG, `Retrieved ${geofences.length} geofences`);
      return geofences;
    } catch (error) {
      logger.error(TAG, 'Failed to get geofences:', error);
      throw error;
    }
  }

  /**
   * Get current position
   */
  async getCurrentPosition(): Promise<Location> {
    try {
      logger.info(TAG, 'Getting current position');
      const location = await BackgroundGeolocation.getCurrentPosition({
        timeout: 30,
        maximumAge: 5000,
        desiredAccuracy: 10,
        samples: 1,
      });
      logger.debug(TAG, 'Current position:', location);
      return location;
    } catch (error) {
      logger.error(TAG, 'Failed to get current position:', error);
      throw error;
    }
  }

  /**
   * Subscribe to geofence events
   */
  onGeofenceEvent(callback: GeofenceEventCallback): () => void {
    this.geofenceCallbacks.push(callback);
    logger.debug(TAG, 'Geofence event callback registered');

    // Return unsubscribe function
    return () => {
      const index = this.geofenceCallbacks.indexOf(callback);
      if (index > -1) {
        this.geofenceCallbacks.splice(index, 1);
        logger.debug(TAG, 'Geofence event callback unregistered');
      }
    };
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback: LocationUpdateCallback): () => void {
    this.locationCallbacks.push(callback);
    logger.debug(TAG, 'Location update callback registered');

    // Return unsubscribe function
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
        logger.debug(TAG, 'Location update callback unregistered');
      }
    };
  }

  /**
   * Check if location services are enabled
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      const state = await this.getState();
      return state.enabled;
    } catch (error) {
      logger.error(TAG, 'Failed to check if location is enabled:', error);
      return false;
    }
  }

  /**
   * Reset the service (for testing or cleanup)
   */
  async reset(): Promise<void> {
    try {
      logger.info(TAG, 'Resetting LocationService');
      await this.stop();
      await this.removeAllGeofences();
      this.geofenceCallbacks = [];
      this.locationCallbacks = [];
      logger.info(TAG, 'LocationService reset successfully');
    } catch (error) {
      logger.error(TAG, 'Failed to reset LocationService:', error);
      throw error;
    }
  }
}

export default new LocationService();

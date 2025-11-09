/**
 * CarPlay Service
 * Detects CarPlay/Android Auto connection and vehicle motion state
 */

import {Platform, NativeModules, NativeEventEmitter} from 'react-native';
import {CarPlayState, CarConnectionType, VehicleState} from '../types';
import {logger} from '../utils';
import LocationService from './LocationService';

const TAG = 'CarPlayService';

type CarPlayConnectionCallback = (state: CarPlayState) => void;
type VehicleStateCallback = (state: VehicleState) => void;

class CarPlayService {
  private isInitialized = false;
  private currentState: CarPlayState = {
    isConnected: false,
    connectionType: CarConnectionType.NONE,
    vehicleState: VehicleState.UNKNOWN,
    speed: 0,
    lastUpdated: new Date(),
  };

  private connectionCallbacks: CarPlayConnectionCallback[] = [];
  private vehicleStateCallbacks: VehicleStateCallback[] = [];
  private eventEmitter: NativeEventEmitter | null = null;
  private speedCheckInterval: NodeJS.Timeout | null = null;

  // Speed threshold to determine if vehicle is moving (km/h)
  private readonly MOVING_SPEED_THRESHOLD = 5;

  /**
   * Initialize the CarPlay service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn(TAG, 'CarPlayService already initialized');
      return;
    }

    try {
      logger.info(TAG, 'Initializing CarPlayService');

      // Set up platform-specific detection
      if (Platform.OS === 'ios') {
        this.initializeCarPlay();
      } else {
        this.initializeAndroidAuto();
      }

      // Start monitoring vehicle state
      this.startVehicleStateMonitoring();

      this.isInitialized = true;
      logger.info(TAG, 'CarPlayService initialized successfully');
    } catch (error) {
      logger.error(TAG, 'Failed to initialize CarPlayService:', error);
      throw error;
    }
  }

  /**
   * Initialize CarPlay detection (iOS)
   */
  private initializeCarPlay(): void {
    try {
      // Check if CarPlay module is available
      const {CarPlay} = NativeModules;

      if (CarPlay) {
        this.eventEmitter = new NativeEventEmitter(CarPlay);

        // Listen for CarPlay connection events
        this.eventEmitter.addListener('carPlayDidConnect', () => {
          logger.info(TAG, 'CarPlay connected');
          this.updateConnectionState(true, CarConnectionType.CARPLAY);
        });

        this.eventEmitter.addListener('carPlayDidDisconnect', () => {
          logger.info(TAG, 'CarPlay disconnected');
          this.updateConnectionState(false, CarConnectionType.NONE);
        });

        // Check initial CarPlay connection state
        CarPlay.isConnected()
          .then((isConnected: boolean) => {
            if (isConnected) {
              this.updateConnectionState(true, CarConnectionType.CARPLAY);
            }
          })
          .catch((error: any) => {
            logger.error(TAG, 'Error checking CarPlay connection:', error);
          });
      } else {
        // Fallback: Detect CarPlay via screen mirroring or audio route
        this.initializeFallbackDetection();
      }
    } catch (error) {
      logger.error(TAG, 'Error initializing CarPlay:', error);
      this.initializeFallbackDetection();
    }
  }

  /**
   * Initialize Android Auto detection (Android)
   */
  private initializeAndroidAuto(): void {
    try {
      // Android Auto detection via projection state
      const {AndroidAuto} = NativeModules;

      if (AndroidAuto) {
        this.eventEmitter = new NativeEventEmitter(AndroidAuto);

        this.eventEmitter.addListener('androidAutoDidConnect', () => {
          logger.info(TAG, 'Android Auto connected');
          this.updateConnectionState(true, CarConnectionType.ANDROID_AUTO);
        });

        this.eventEmitter.addListener('androidAutoDidDisconnect', () => {
          logger.info(TAG, 'Android Auto disconnected');
          this.updateConnectionState(false, CarConnectionType.NONE);
        });

        // Check initial connection state
        AndroidAuto.isConnected()
          .then((isConnected: boolean) => {
            if (isConnected) {
              this.updateConnectionState(true, CarConnectionType.ANDROID_AUTO);
            }
          })
          .catch((error: any) => {
            logger.error(TAG, 'Error checking Android Auto connection:', error);
          });
      } else {
        // Fallback detection for Android
        this.initializeFallbackDetection();
      }
    } catch (error) {
      logger.error(TAG, 'Error initializing Android Auto:', error);
      this.initializeFallbackDetection();
    }
  }

  /**
   * Fallback detection using audio route and Bluetooth
   */
  private initializeFallbackDetection(): void {
    logger.info(TAG, 'Using fallback detection for car connection');

    // We can infer car connection from:
    // 1. Bluetooth audio device with specific patterns
    // 2. USB audio connection
    // 3. Continuous high-speed movement with location tracking

    // This is a simplified detection - in production, you'd use native modules
    // For now, we'll primarily rely on speed-based detection
  }

  /**
   * Start monitoring vehicle state based on speed
   */
  private startVehicleStateMonitoring(): void {
    if (this.speedCheckInterval) {
      clearInterval(this.speedCheckInterval);
    }

    // Check speed every 5 seconds
    this.speedCheckInterval = setInterval(() => {
      this.checkVehicleState();
    }, 5000);

    logger.debug(TAG, 'Vehicle state monitoring started');
  }

  /**
   * Check current vehicle state based on location speed
   */
  private async checkVehicleState(): Promise<void> {
    try {
      // Get current location with speed
      const location = await LocationService.getCurrentPosition();

      if (location && location.coords.speed !== undefined) {
        // Convert m/s to km/h
        const speedKmh = location.coords.speed * 3.6;
        const previousState = this.currentState.vehicleState;
        const newState =
          speedKmh >= this.MOVING_SPEED_THRESHOLD
            ? VehicleState.MOVING
            : VehicleState.STATIONARY;

        // Update state
        this.currentState.speed = speedKmh;
        this.currentState.vehicleState = newState;
        this.currentState.lastUpdated = new Date();

        // Notify if state changed
        if (previousState !== newState) {
          logger.info(
            TAG,
            `Vehicle state changed: ${previousState} -> ${newState} (${speedKmh.toFixed(1)} km/h)`,
          );
          this.notifyVehicleStateCallbacks(newState);
          this.notifyConnectionCallbacks();
        }
      }
    } catch (error) {
      logger.debug(TAG, 'Could not determine vehicle state from location:', error);
    }
  }

  /**
   * Update CarPlay/Android Auto connection state
   */
  private updateConnectionState(
    isConnected: boolean,
    connectionType: CarConnectionType,
  ): void {
    this.currentState.isConnected = isConnected;
    this.currentState.connectionType = connectionType;
    this.currentState.lastUpdated = new Date();

    this.notifyConnectionCallbacks();
  }

  /**
   * Get current CarPlay state
   */
  getState(): CarPlayState {
    return {...this.currentState};
  }

  /**
   * Check if connected to car (CarPlay or Android Auto)
   */
  isConnectedToCar(): boolean {
    return this.currentState.isConnected;
  }

  /**
   * Get connection type
   */
  getConnectionType(): CarConnectionType {
    return this.currentState.connectionType;
  }

  /**
   * Check if vehicle is moving
   */
  isVehicleMoving(): boolean {
    return this.currentState.vehicleState === VehicleState.MOVING;
  }

  /**
   * Check if vehicle is stationary
   */
  isVehicleStationary(): boolean {
    return this.currentState.vehicleState === VehicleState.STATIONARY;
  }

  /**
   * Get current vehicle speed
   */
  getVehicleSpeed(): number {
    return this.currentState.speed || 0;
  }

  /**
   * Check if safe to play audio (based on preferences)
   */
  isSafeToPlay(maxSpeed: number = 100): boolean {
    const speed = this.getVehicleSpeed();
    return speed < maxSpeed;
  }

  /**
   * Subscribe to CarPlay connection state changes
   */
  onConnectionChange(callback: CarPlayConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    logger.debug(TAG, 'Connection callback registered');

    // Return unsubscribe function
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
        logger.debug(TAG, 'Connection callback unregistered');
      }
    };
  }

  /**
   * Subscribe to vehicle state changes
   */
  onVehicleStateChange(callback: VehicleStateCallback): () => void {
    this.vehicleStateCallbacks.push(callback);
    logger.debug(TAG, 'Vehicle state callback registered');

    // Return unsubscribe function
    return () => {
      const index = this.vehicleStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.vehicleStateCallbacks.splice(index, 1);
        logger.debug(TAG, 'Vehicle state callback unregistered');
      }
    };
  }

  /**
   * Notify connection callbacks
   */
  private notifyConnectionCallbacks(): void {
    const state = this.getState();
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        logger.error(TAG, 'Error in connection callback:', error);
      }
    });
  }

  /**
   * Notify vehicle state callbacks
   */
  private notifyVehicleStateCallbacks(state: VehicleState): void {
    this.vehicleStateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        logger.error(TAG, 'Error in vehicle state callback:', error);
      }
    });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    logger.info(TAG, 'Stopping CarPlayService');

    if (this.speedCheckInterval) {
      clearInterval(this.speedCheckInterval);
      this.speedCheckInterval = null;
    }

    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('carPlayDidConnect');
      this.eventEmitter.removeAllListeners('carPlayDidDisconnect');
      this.eventEmitter.removeAllListeners('androidAutoDidConnect');
      this.eventEmitter.removeAllListeners('androidAutoDidDisconnect');
    }

    logger.info(TAG, 'CarPlayService stopped');
  }

  /**
   * Reset the service
   */
  reset(): void {
    logger.info(TAG, 'Resetting CarPlayService');
    this.stop();
    this.connectionCallbacks = [];
    this.vehicleStateCallbacks = [];
    this.currentState = {
      isConnected: false,
      connectionType: CarConnectionType.NONE,
      vehicleState: VehicleState.UNKNOWN,
      speed: 0,
      lastUpdated: new Date(),
    };
  }
}

export default new CarPlayService();

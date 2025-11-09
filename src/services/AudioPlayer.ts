/**
 * Audio Player Service
 * Manages audio playback with earphone and CarPlay detection
 */

import Sound from 'react-native-sound';
import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {VoiceNote, PlaybackState, AudioPlayerState, VehicleState} from '../types';
import {AUDIO_CONFIG} from '../constants';
import {logger} from '../utils';
import CarPlayService from './CarPlayService';

const TAG = 'AudioPlayer';

type PlaybackStateCallback = (state: AudioPlayerState) => void;
type EarphonesCallback = (connected: boolean) => void;

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback', true);

class AudioPlayer {
  private currentSound: Sound | null = null;
  private currentVoiceNote: VoiceNote | null = null;
  private playbackState: PlaybackState = PlaybackState.IDLE;
  private currentTime = 0;
  private duration = 0;
  private isEarphonesConnected = false;
  private isCarPlayConnected = false;
  private vehicleState: VehicleState = VehicleState.UNKNOWN;
  private volume = AUDIO_CONFIG.DEFAULT_VOLUME;
  private playbackSpeed = AUDIO_CONFIG.DEFAULT_PLAYBACK_SPEED;
  private stateCallbacks: PlaybackStateCallback[] = [];
  private earphonesCallbacks: EarphonesCallback[] = [];
  private progressIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEarphonesDetection();
    this.setupCarPlayDetection();
  }

  /**
   * Set up earphones/headphones detection
   */
  private setupEarphonesDetection(): void {
    // Check initial state
    this.checkEarphonesConnection();

    // Listen for audio device changes
    if (Platform.OS === 'ios') {
      const audioSession = NativeModules.AudioSession;
      if (audioSession) {
        const eventEmitter = new NativeEventEmitter(audioSession);
        eventEmitter.addListener('audioRouteChanged', this.handleAudioRouteChange.bind(this));
      }
    } else {
      // Android headphone detection would go here
      // Using DeviceInfo or native module
    }

    logger.debug(TAG, 'Earphones detection set up');
  }

  /**
   * Handle audio route changes (iOS)
   */
  private handleAudioRouteChange(event: any): void {
    logger.debug(TAG, 'Audio route changed:', event);
    this.checkEarphonesConnection();
  }

  /**
   * Check if earphones are connected
   */
  private async checkEarphonesConnection(): Promise<void> {
    try {
      const isHeadphonesConnected = await DeviceInfo.isHeadphonesConnected();
      const previousState = this.isEarphonesConnected;
      this.isEarphonesConnected = isHeadphonesConnected;

      if (previousState !== isHeadphonesConnected) {
        logger.info(TAG, `Earphones ${isHeadphonesConnected ? 'connected' : 'disconnected'}`);
        this.notifyEarphonesCallbacks(isHeadphonesConnected);
        this.notifyStateCallbacks();
      }
    } catch (error) {
      logger.error(TAG, 'Error checking earphones connection:', error);
    }
  }

  /**
   * Set up CarPlay/Android Auto detection
   */
  private setupCarPlayDetection(): void {
    // Subscribe to CarPlay connection changes
    CarPlayService.onConnectionChange(carPlayState => {
      const wasConnected = this.isCarPlayConnected;
      this.isCarPlayConnected = carPlayState.isConnected;
      this.vehicleState = carPlayState.vehicleState;

      if (wasConnected !== carPlayState.isConnected) {
        logger.info(
          TAG,
          `CarPlay ${carPlayState.isConnected ? 'connected' : 'disconnected'} (${carPlayState.connectionType})`,
        );
        this.notifyStateCallbacks();
      }
    });

    // Subscribe to vehicle state changes
    CarPlayService.onVehicleStateChange(vehicleState => {
      const previousState = this.vehicleState;
      this.vehicleState = vehicleState;

      if (previousState !== vehicleState) {
        logger.info(TAG, `Vehicle state changed: ${previousState} -> ${vehicleState}`);
        this.notifyStateCallbacks();
      }
    });

    logger.debug(TAG, 'CarPlay detection set up');
  }

  /**
   * Check if playback is allowed based on audio output and safety settings
   * CarPlay/Android Auto bypasses earphone requirement
   */
  private isPlaybackAllowed(requireEarphones: boolean = false): boolean {
    // If connected to CarPlay/Android Auto, playback is always allowed
    if (this.isCarPlayConnected) {
      logger.debug(TAG, 'Playback allowed: CarPlay connected');
      return true;
    }

    // If earphones are not required, playback is allowed
    if (!requireEarphones) {
      logger.debug(TAG, 'Playback allowed: Earphones not required');
      return true;
    }

    // Otherwise, check if earphones are connected
    if (this.isEarphonesConnected) {
      logger.debug(TAG, 'Playback allowed: Earphones connected');
      return true;
    }

    logger.warn(TAG, 'Playback not allowed: Earphones required but not connected');
    return false;
  }

  /**
   * Load and prepare audio file
   */
  async load(voiceNote: VoiceNote): Promise<void> {
    try {
      logger.info(TAG, `Loading voice note: ${voiceNote.id}`);

      // Stop current playback if any
      await this.stop();

      this.setPlaybackState(PlaybackState.LOADING);
      this.currentVoiceNote = voiceNote;

      return new Promise((resolve, reject) => {
        this.currentSound = new Sound(voiceNote.audioUrl, Sound.MAIN_BUNDLE, error => {
          if (error) {
            logger.error(TAG, 'Failed to load sound:', error);
            this.setPlaybackState(PlaybackState.ERROR);
            reject(error);
            return;
          }

          this.duration = this.currentSound?.getDuration() ?? 0;
          this.currentSound?.setVolume(this.volume);
          this.currentSound?.setSpeed(this.playbackSpeed);

          logger.info(TAG, `Voice note loaded successfully: ${voiceNote.id}`);
          this.setPlaybackState(PlaybackState.IDLE);
          resolve();
        });
      });
    } catch (error) {
      logger.error(TAG, 'Error loading voice note:', error);
      this.setPlaybackState(PlaybackState.ERROR);
      throw error;
    }
  }

  /**
   * Play the loaded audio
   */
  async play(): Promise<void> {
    if (!this.currentSound) {
      logger.warn(TAG, 'No sound loaded');
      throw new Error('No sound loaded');
    }

    if (this.playbackState === PlaybackState.PLAYING) {
      logger.warn(TAG, 'Already playing');
      return;
    }

    try {
      logger.info(TAG, 'Starting playback');

      this.currentSound.play(success => {
        if (success) {
          logger.info(TAG, 'Playback finished successfully');
          this.handlePlaybackComplete();
        } else {
          logger.error(TAG, 'Playback failed');
          this.setPlaybackState(PlaybackState.ERROR);
        }
      });

      this.setPlaybackState(PlaybackState.PLAYING);
      this.startProgressTracking();
    } catch (error) {
      logger.error(TAG, 'Error playing audio:', error);
      this.setPlaybackState(PlaybackState.ERROR);
      throw error;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.currentSound || this.playbackState !== PlaybackState.PLAYING) {
      logger.warn(TAG, 'Cannot pause - not playing');
      return;
    }

    try {
      logger.info(TAG, 'Pausing playback');
      this.currentSound.pause();
      this.setPlaybackState(PlaybackState.PAUSED);
      this.stopProgressTracking();
    } catch (error) {
      logger.error(TAG, 'Error pausing audio:', error);
      throw error;
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    if (!this.currentSound) {
      return;
    }

    try {
      logger.info(TAG, 'Stopping playback');
      this.currentSound.stop();
      this.currentSound.release();
      this.currentSound = null;
      this.currentTime = 0;
      this.setPlaybackState(PlaybackState.STOPPED);
      this.stopProgressTracking();
    } catch (error) {
      logger.error(TAG, 'Error stopping audio:', error);
      throw error;
    }
  }

  /**
   * Seek to specific time
   */
  async seek(timeInSeconds: number): Promise<void> {
    if (!this.currentSound) {
      logger.warn(TAG, 'No sound loaded');
      return;
    }

    try {
      logger.debug(TAG, `Seeking to ${timeInSeconds}s`);
      this.currentSound.setCurrentTime(timeInSeconds);
      this.currentTime = timeInSeconds;
      this.notifyStateCallbacks();
    } catch (error) {
      logger.error(TAG, 'Error seeking:', error);
      throw error;
    }
  }

  /**
   * Set volume (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentSound) {
      this.currentSound.setVolume(this.volume);
    }
    logger.debug(TAG, `Volume set to ${this.volume}`);
    this.notifyStateCallbacks();
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed: number): void {
    const clampedSpeed = Math.max(
      AUDIO_CONFIG.MIN_PLAYBACK_SPEED,
      Math.min(AUDIO_CONFIG.MAX_PLAYBACK_SPEED, speed),
    );
    this.playbackSpeed = clampedSpeed;

    if (this.currentSound) {
      this.currentSound.setSpeed(this.playbackSpeed);
    }

    logger.debug(TAG, `Playback speed set to ${this.playbackSpeed}x`);
    this.notifyStateCallbacks();
  }

  /**
   * Handle playback completion
   */
  private handlePlaybackComplete(): void {
    logger.info(TAG, 'Playback completed');
    this.currentTime = 0;
    this.setPlaybackState(PlaybackState.IDLE);
    this.stopProgressTracking();

    // Update voice note as played
    if (this.currentVoiceNote) {
      this.currentVoiceNote.isPlayed = true;
      this.currentVoiceNote.playedAt = new Date();
    }
  }

  /**
   * Start tracking playback progress
   */
  private startProgressTracking(): void {
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
    }

    this.progressIntervalId = setInterval(() => {
      if (this.currentSound && this.playbackState === PlaybackState.PLAYING) {
        this.currentSound.getCurrentTime(seconds => {
          this.currentTime = seconds;
          this.notifyStateCallbacks();
        });
      }
    }, 100); // Update every 100ms
  }

  /**
   * Stop tracking playback progress
   */
  private stopProgressTracking(): void {
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }
  }

  /**
   * Set playback state and notify callbacks
   */
  private setPlaybackState(state: PlaybackState): void {
    this.playbackState = state;
    this.notifyStateCallbacks();
  }

  /**
   * Get current player state
   */
  getState(): AudioPlayerState {
    return {
      currentVoiceNote: this.currentVoiceNote,
      playbackState: this.playbackState,
      currentTime: this.currentTime,
      duration: this.duration,
      isEarphonesConnected: this.isEarphonesConnected,
      isCarPlayConnected: this.isCarPlayConnected,
      vehicleState: this.vehicleState,
    };
  }

  /**
   * Check if earphones are connected
   */
  areEarphonesConnected(): boolean {
    return this.isEarphonesConnected;
  }

  /**
   * Check if connected to CarPlay/Android Auto
   */
  isCarPlay(): boolean {
    return this.isCarPlayConnected;
  }

  /**
   * Get current vehicle state
   */
  getVehicleState(): VehicleState {
    return this.vehicleState;
  }

  /**
   * Subscribe to playback state changes
   */
  onStateChange(callback: PlaybackStateCallback): () => void {
    this.stateCallbacks.push(callback);
    logger.debug(TAG, 'State callback registered');

    return () => {
      const index = this.stateCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateCallbacks.splice(index, 1);
        logger.debug(TAG, 'State callback unregistered');
      }
    };
  }

  /**
   * Subscribe to earphones connection changes
   */
  onEarphonesChange(callback: EarphonesCallback): () => void {
    this.earphonesCallbacks.push(callback);
    logger.debug(TAG, 'Earphones callback registered');

    return () => {
      const index = this.earphonesCallbacks.indexOf(callback);
      if (index > -1) {
        this.earphonesCallbacks.splice(index, 1);
        logger.debug(TAG, 'Earphones callback unregistered');
      }
    };
  }

  /**
   * Notify state callbacks
   */
  private notifyStateCallbacks(): void {
    const state = this.getState();
    this.stateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        logger.error(TAG, 'Error in state callback:', error);
      }
    });
  }

  /**
   * Notify earphones callbacks
   */
  private notifyEarphonesCallbacks(connected: boolean): void {
    this.earphonesCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        logger.error(TAG, 'Error in earphones callback:', error);
      }
    });
  }

  /**
   * Reset the player
   */
  async reset(): Promise<void> {
    logger.info(TAG, 'Resetting AudioPlayer');
    await this.stop();
    this.stateCallbacks = [];
    this.earphonesCallbacks = [];
    this.volume = AUDIO_CONFIG.DEFAULT_VOLUME;
    this.playbackSpeed = AUDIO_CONFIG.DEFAULT_PLAYBACK_SPEED;
  }
}

export default new AudioPlayer();

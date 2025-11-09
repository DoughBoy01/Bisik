/**
 * Schedule Service
 * Manages time-based triggers for voice notes
 */

import BackgroundFetch from 'react-native-background-fetch';
import {ScheduledTrigger, RepeatPattern} from '../types';
import {BACKGROUND_FETCH_CONFIG} from '../constants';
import {logger} from '../utils';
import NotificationManager from './NotificationManager';

const TAG = 'ScheduleService';

type ScheduledTriggerCallback = (trigger: ScheduledTrigger) => void;

class ScheduleService {
  private isInitialized = false;
  private triggers: Map<string, ScheduledTrigger> = new Map();
  private triggerCallbacks: ScheduledTriggerCallback[] = [];
  private checkIntervalId: NodeJS.Timeout | null = null;

  /**
   * Initialize the schedule service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn(TAG, 'ScheduleService already initialized');
      return;
    }

    try {
      logger.info(TAG, 'Initializing ScheduleService');

      // Configure background fetch
      const status = await BackgroundFetch.configure(
        {
          minimumFetchInterval: BACKGROUND_FETCH_CONFIG.MINIMUM_FETCH_INTERVAL,
          stopOnTerminate: BACKGROUND_FETCH_CONFIG.STOP_ON_TERMINATE,
          startOnBoot: BACKGROUND_FETCH_CONFIG.START_ON_BOOT,
          enableHeadless: BACKGROUND_FETCH_CONFIG.ENABLE_HEADLESS,
          requiresBatteryNotLow: false,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresStorageNotLow: false,
        },
        this.handleBackgroundFetch.bind(this),
        this.handleBackgroundFetchTimeout.bind(this),
      );

      logger.info(TAG, `BackgroundFetch configured with status: ${status}`);

      // Start periodic check for scheduled triggers
      this.startPeriodicCheck();

      this.isInitialized = true;
      logger.info(TAG, 'ScheduleService initialized successfully');
    } catch (error) {
      logger.error(TAG, 'Failed to initialize ScheduleService:', error);
      throw error;
    }
  }

  /**
   * Handle background fetch event
   */
  private async handleBackgroundFetch(taskId: string): Promise<void> {
    logger.info(TAG, `Background fetch started: ${taskId}`);

    try {
      // Check for due triggers
      await this.checkScheduledTriggers();

      // Signal completion
      BackgroundFetch.finish(taskId);
      logger.info(TAG, `Background fetch completed: ${taskId}`);
    } catch (error) {
      logger.error(TAG, `Background fetch error: ${taskId}`, error);
      BackgroundFetch.finish(taskId);
    }
  }

  /**
   * Handle background fetch timeout
   */
  private handleBackgroundFetchTimeout(taskId: string): void {
    logger.warn(TAG, `Background fetch timeout: ${taskId}`);
    BackgroundFetch.finish(taskId);
  }

  /**
   * Start periodic check for scheduled triggers (foreground)
   */
  private startPeriodicCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    // Check every minute for due triggers
    this.checkIntervalId = setInterval(() => {
      this.checkScheduledTriggers();
    }, 60000);

    logger.debug(TAG, 'Periodic trigger check started');
  }

  /**
   * Stop periodic check
   */
  private stopPeriodicCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      logger.debug(TAG, 'Periodic trigger check stopped');
    }
  }

  /**
   * Check for scheduled triggers that are due
   */
  private async checkScheduledTriggers(): Promise<void> {
    const now = new Date();
    const dueTriggers: ScheduledTrigger[] = [];

    this.triggers.forEach(trigger => {
      if (!trigger.enabled) return;

      if (this.isTriggerDue(trigger, now)) {
        dueTriggers.push(trigger);
      }
    });

    if (dueTriggers.length > 0) {
      logger.info(TAG, `Found ${dueTriggers.length} due triggers`);

      for (const trigger of dueTriggers) {
        await this.executeTrigger(trigger);
      }
    }
  }

  /**
   * Check if a trigger is due
   */
  private isTriggerDue(trigger: ScheduledTrigger, now: Date): boolean {
    const triggerTime = new Date(trigger.triggerTime);

    // Check if trigger time has passed
    if (triggerTime > now) {
      return false;
    }

    // Check if it's within the last minute (to avoid multiple triggers)
    const timeDiff = now.getTime() - triggerTime.getTime();
    if (timeDiff > 60000) {
      // More than a minute old - check if it should repeat
      return this.shouldTriggerRepeat(trigger, now);
    }

    // Check day of week if specified
    if (trigger.daysOfWeek && trigger.daysOfWeek.length > 0) {
      const currentDay = now.getDay();
      return trigger.daysOfWeek.includes(currentDay);
    }

    return true;
  }

  /**
   * Check if a trigger should repeat
   */
  private shouldTriggerRepeat(trigger: ScheduledTrigger, now: Date): boolean {
    if (!trigger.repeat || trigger.repeat === RepeatPattern.NONE) {
      return false;
    }

    const triggerTime = new Date(trigger.triggerTime);
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const triggerHour = triggerTime.getHours();
    const triggerMinute = triggerTime.getMinutes();

    // Check if current time matches trigger time (within same minute)
    const timeMatches =
      currentHour === triggerHour && currentMinute === triggerMinute;

    if (!timeMatches) {
      return false;
    }

    switch (trigger.repeat) {
      case RepeatPattern.DAILY:
        return true;

      case RepeatPattern.WEEKLY:
        return currentDay === triggerTime.getDay();

      case RepeatPattern.WEEKDAYS:
        return currentDay >= 1 && currentDay <= 5;

      case RepeatPattern.WEEKENDS:
        return currentDay === 0 || currentDay === 6;

      case RepeatPattern.CUSTOM:
        return (
          trigger.daysOfWeek?.includes(currentDay) ?? false
        );

      default:
        return false;
    }
  }

  /**
   * Execute a scheduled trigger
   */
  private async executeTrigger(trigger: ScheduledTrigger): Promise<void> {
    logger.info(TAG, `Executing trigger: ${trigger.id}`);

    // Notify all callbacks
    this.triggerCallbacks.forEach(callback => {
      try {
        callback(trigger);
      } catch (error) {
        logger.error(TAG, 'Error in trigger callback:', error);
      }
    });

    // Schedule notification
    await NotificationManager.scheduleVoiceNoteTrigger(trigger.voiceNoteId);

    // If it's a non-repeating trigger, disable it
    if (!trigger.repeat || trigger.repeat === RepeatPattern.NONE) {
      this.disableTrigger(trigger.id);
    }
  }

  /**
   * Add a scheduled trigger
   */
  async addTrigger(trigger: ScheduledTrigger): Promise<void> {
    try {
      logger.info(TAG, `Adding trigger: ${trigger.id}`);
      this.triggers.set(trigger.id, trigger);
      logger.info(TAG, `Trigger added successfully: ${trigger.id}`);
    } catch (error) {
      logger.error(TAG, `Failed to add trigger ${trigger.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a scheduled trigger
   */
  async removeTrigger(triggerId: string): Promise<void> {
    try {
      logger.info(TAG, `Removing trigger: ${triggerId}`);
      this.triggers.delete(triggerId);
      logger.info(TAG, `Trigger removed successfully: ${triggerId}`);
    } catch (error) {
      logger.error(TAG, `Failed to remove trigger ${triggerId}:`, error);
      throw error;
    }
  }

  /**
   * Update a scheduled trigger
   */
  async updateTrigger(trigger: ScheduledTrigger): Promise<void> {
    try {
      logger.info(TAG, `Updating trigger: ${trigger.id}`);
      this.triggers.set(trigger.id, trigger);
      logger.info(TAG, `Trigger updated successfully: ${trigger.id}`);
    } catch (error) {
      logger.error(TAG, `Failed to update trigger ${trigger.id}:`, error);
      throw error;
    }
  }

  /**
   * Enable a trigger
   */
  enableTrigger(triggerId: string): void {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = true;
      this.triggers.set(triggerId, trigger);
      logger.info(TAG, `Trigger enabled: ${triggerId}`);
    }
  }

  /**
   * Disable a trigger
   */
  disableTrigger(triggerId: string): void {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = false;
      this.triggers.set(triggerId, trigger);
      logger.info(TAG, `Trigger disabled: ${triggerId}`);
    }
  }

  /**
   * Get all triggers
   */
  getAllTriggers(): ScheduledTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Get trigger by ID
   */
  getTrigger(triggerId: string): ScheduledTrigger | undefined {
    return this.triggers.get(triggerId);
  }

  /**
   * Get triggers for a specific voice note
   */
  getTriggersForVoiceNote(voiceNoteId: string): ScheduledTrigger[] {
    return Array.from(this.triggers.values()).filter(
      trigger => trigger.voiceNoteId === voiceNoteId,
    );
  }

  /**
   * Clear all triggers
   */
  clearAllTriggers(): void {
    logger.info(TAG, 'Clearing all triggers');
    this.triggers.clear();
  }

  /**
   * Subscribe to trigger events
   */
  onTrigger(callback: ScheduledTriggerCallback): () => void {
    this.triggerCallbacks.push(callback);
    logger.debug(TAG, 'Trigger callback registered');

    // Return unsubscribe function
    return () => {
      const index = this.triggerCallbacks.indexOf(callback);
      if (index > -1) {
        this.triggerCallbacks.splice(index, 1);
        logger.debug(TAG, 'Trigger callback unregistered');
      }
    };
  }

  /**
   * Get background fetch status
   */
  async getStatus(): Promise<number> {
    return await BackgroundFetch.status();
  }

  /**
   * Stop the schedule service
   */
  async stop(): Promise<void> {
    logger.info(TAG, 'Stopping ScheduleService');
    this.stopPeriodicCheck();
    await BackgroundFetch.stop();
    logger.info(TAG, 'ScheduleService stopped');
  }

  /**
   * Reset the service
   */
  async reset(): Promise<void> {
    logger.info(TAG, 'Resetting ScheduleService');
    await this.stop();
    this.clearAllTriggers();
    this.triggerCallbacks = [];
    logger.info(TAG, 'ScheduleService reset');
  }
}

export default new ScheduleService();

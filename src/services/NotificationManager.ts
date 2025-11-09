/**
 * Notification Manager Service
 * Manages local notifications for voice note triggers
 */

import PushNotification, {PushNotificationObject} from 'react-native-push-notification';
import {Platform} from 'react-native';
import {LocalNotification} from '../types';
import {NOTIFICATION_CONFIG} from '../constants';
import {logger, generateId} from '../utils';

const TAG = 'NotificationManager';

type NotificationCallback = (notification: any) => void;

class NotificationManager {
  private isInitialized = false;
  private notificationCallbacks: NotificationCallback[] = [];

  /**
   * Initialize the notification manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn(TAG, 'NotificationManager already initialized');
      return;
    }

    try {
      logger.info(TAG, 'Initializing NotificationManager');

      // Configure push notifications
      PushNotification.configure({
        onRegister: token => {
          logger.debug(TAG, 'Device token:', token);
        },

        onNotification: notification => {
          logger.info(TAG, 'Notification received:', notification);
          this.handleNotification(notification);
        },

        onAction: notification => {
          logger.info(TAG, 'Notification action:', notification);
        },

        onRegistrationError: err => {
          logger.error(TAG, 'Registration error:', err);
        },

        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannel();
      }

      this.isInitialized = true;
      logger.info(TAG, 'NotificationManager initialized successfully');
    } catch (error) {
      logger.error(TAG, 'Failed to initialize NotificationManager:', error);
      throw error;
    }
  }

  /**
   * Create notification channel (Android)
   */
  private createNotificationChannel(): void {
    PushNotification.createChannel(
      {
        channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
        channelName: NOTIFICATION_CONFIG.CHANNEL_NAME,
        channelDescription: NOTIFICATION_CONFIG.CHANNEL_DESCRIPTION,
        playSound: true,
        soundName: NOTIFICATION_CONFIG.SOUND_NAME,
        importance: 4, // High importance
        vibrate: true,
      },
      created => {
        logger.debug(TAG, `Channel created: ${created}`);
      },
    );
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(notification: any): void {
    logger.debug(TAG, 'Handling notification:', notification);

    // Notify all callbacks
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        logger.error(TAG, 'Error in notification callback:', error);
      }
    });

    // Mark notification as delivered (required for iOS)
    if (Platform.OS === 'ios') {
      notification.finish(PushNotification.FetchResult.NoData);
    }
  }

  /**
   * Show a local notification immediately
   */
  showNotification(notification: LocalNotification): void {
    logger.info(TAG, `Showing notification: ${notification.title}`);

    const config: PushNotificationObject = {
      channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
      id: notification.id,
      title: notification.title,
      message: notification.message,
      playSound: true,
      soundName: notification.sound || NOTIFICATION_CONFIG.SOUND_NAME,
      priority: notification.priority || 'high',
      vibrate: true,
      vibration: 300,
      userInfo: notification.data,
      smallIcon: 'ic_notification',
      largeIcon: 'ic_launcher',
    };

    PushNotification.localNotification(config);
  }

  /**
   * Schedule a local notification
   */
  scheduleNotification(notification: LocalNotification): void {
    if (!notification.scheduledTime) {
      logger.warn(TAG, 'No scheduled time provided');
      return;
    }

    logger.info(TAG, `Scheduling notification: ${notification.title} for ${notification.scheduledTime}`);

    const config: PushNotificationObject = {
      channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
      id: notification.id,
      title: notification.title,
      message: notification.message,
      date: notification.scheduledTime,
      playSound: true,
      soundName: notification.sound || NOTIFICATION_CONFIG.SOUND_NAME,
      priority: notification.priority || 'high',
      vibrate: true,
      vibration: 300,
      userInfo: notification.data,
      smallIcon: 'ic_notification',
      largeIcon: 'ic_launcher',
    };

    PushNotification.localNotificationSchedule(config);
  }

  /**
   * Show notification for voice note trigger
   */
  async scheduleVoiceNoteTrigger(voiceNoteId: string): Promise<void> {
    logger.info(TAG, `Scheduling voice note trigger notification: ${voiceNoteId}`);

    const notification: LocalNotification = {
      id: generateId(),
      title: 'New Voice Note Available',
      message: 'Tap to listen to your personalized message',
      data: {
        type: 'voice_note_trigger',
        voiceNoteId,
      },
      priority: 'high',
    };

    this.showNotification(notification);
  }

  /**
   * Show notification for geofence event
   */
  async showGeofenceNotification(
    identifier: string,
    action: 'ENTER' | 'EXIT',
  ): Promise<void> {
    logger.info(TAG, `Showing geofence notification: ${identifier} - ${action}`);

    const notification: LocalNotification = {
      id: generateId(),
      title: action === 'ENTER' ? 'Welcome!' : 'Goodbye!',
      message:
        action === 'ENTER'
          ? 'You have a voice note waiting for you'
          : 'Thanks for visiting!',
      data: {
        type: 'geofence',
        identifier,
        action,
      },
      priority: 'high',
    };

    this.showNotification(notification);
  }

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(notificationId: string): void {
    logger.info(TAG, `Canceling notification: ${notificationId}`);
    PushNotification.cancelLocalNotification(notificationId);
  }

  /**
   * Cancel all notifications
   */
  cancelAllNotifications(): void {
    logger.info(TAG, 'Canceling all notifications');
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Get all scheduled notifications
   */
  getScheduledNotifications(): Promise<any[]> {
    return new Promise(resolve => {
      PushNotification.getScheduledLocalNotifications(notifications => {
        logger.debug(TAG, `Retrieved ${notifications.length} scheduled notifications`);
        resolve(notifications);
      });
    });
  }

  /**
   * Remove all delivered notifications
   */
  removeAllDeliveredNotifications(): void {
    logger.info(TAG, 'Removing all delivered notifications');
    PushNotification.removeAllDeliveredNotifications();
  }

  /**
   * Set application badge number (iOS)
   */
  setBadgeNumber(number: number): void {
    if (Platform.OS === 'ios') {
      logger.debug(TAG, `Setting badge number to ${number}`);
      PushNotification.setApplicationIconBadgeNumber(number);
    }
  }

  /**
   * Get application badge number (iOS)
   */
  getBadgeNumber(): Promise<number> {
    return new Promise(resolve => {
      if (Platform.OS === 'ios') {
        PushNotification.getApplicationIconBadgeNumber(number => {
          logger.debug(TAG, `Badge number: ${number}`);
          resolve(number);
        });
      } else {
        resolve(0);
      }
    });
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermissions(): Promise<boolean> {
    return new Promise(resolve => {
      PushNotification.checkPermissions(permissions => {
        const enabled = permissions.alert && permissions.badge && permissions.sound;
        logger.debug(TAG, 'Notification permissions:', permissions);
        resolve(enabled);
      });
    });
  }

  /**
   * Subscribe to notification events
   */
  onNotification(callback: NotificationCallback): () => void {
    this.notificationCallbacks.push(callback);
    logger.debug(TAG, 'Notification callback registered');

    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
        logger.debug(TAG, 'Notification callback unregistered');
      }
    };
  }

  /**
   * Reset the notification manager
   */
  reset(): void {
    logger.info(TAG, 'Resetting NotificationManager');
    this.cancelAllNotifications();
    this.removeAllDeliveredNotifications();
    this.notificationCallbacks = [];
    this.setBadgeNumber(0);
  }
}

export default new NotificationManager();

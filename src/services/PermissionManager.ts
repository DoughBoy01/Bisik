/**
 * Permission Manager Service
 * Handles requesting and managing all app permissions
 */

import {Platform, Alert, Linking} from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  Permission,
  openSettings,
} from 'react-native-permissions';
import {PermissionType, PermissionStatus} from '../types';
import {logger} from '../utils';

const TAG = 'PermissionManager';

class PermissionManager {
  private permissionMap: Record<PermissionType, Permission> = {
    [PermissionType.LOCATION]: Platform.select({
      ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    })!,
    [PermissionType.LOCATION_ALWAYS]: Platform.select({
      ios: PERMISSIONS.IOS.LOCATION_ALWAYS,
      android: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
    })!,
    [PermissionType.NOTIFICATIONS]: Platform.select({
      ios: PERMISSIONS.IOS.NOTIFICATIONS,
      android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
    })!,
    [PermissionType.CONTACTS]: Platform.select({
      ios: PERMISSIONS.IOS.CONTACTS,
      android: PERMISSIONS.ANDROID.READ_CONTACTS,
    })!,
  };

  /**
   * Check if a permission is granted
   */
  async checkPermission(type: PermissionType): Promise<PermissionStatus> {
    try {
      const permission = this.permissionMap[type];
      if (!permission) {
        logger.warn(TAG, `Permission not defined for type: ${type}`);
        return {type, granted: false, canAskAgain: false};
      }

      const result = await check(permission);
      logger.debug(TAG, `Permission check for ${type}:`, result);

      return {
        type,
        granted: result === RESULTS.GRANTED,
        canAskAgain: result !== RESULTS.BLOCKED && result !== RESULTS.UNAVAILABLE,
      };
    } catch (error) {
      logger.error(TAG, `Error checking permission ${type}:`, error);
      return {type, granted: false, canAskAgain: false};
    }
  }

  /**
   * Request a specific permission
   */
  async requestPermission(type: PermissionType): Promise<PermissionStatus> {
    try {
      // First check current status
      const currentStatus = await this.checkPermission(type);

      if (currentStatus.granted) {
        logger.info(TAG, `Permission ${type} already granted`);
        return currentStatus;
      }

      if (!currentStatus.canAskAgain) {
        logger.warn(TAG, `Permission ${type} cannot be requested (blocked or unavailable)`);
        this.showPermissionBlockedAlert(type);
        return currentStatus;
      }

      // Request the permission
      const permission = this.permissionMap[type];
      const result = await request(permission);
      logger.info(TAG, `Permission request result for ${type}:`, result);

      const newStatus: PermissionStatus = {
        type,
        granted: result === RESULTS.GRANTED,
        canAskAgain: result !== RESULTS.BLOCKED && result !== RESULTS.UNAVAILABLE,
      };

      if (!newStatus.granted && !newStatus.canAskAgain) {
        this.showPermissionBlockedAlert(type);
      }

      return newStatus;
    } catch (error) {
      logger.error(TAG, `Error requesting permission ${type}:`, error);
      return {type, granted: false, canAskAgain: false};
    }
  }

  /**
   * Request location permission (when in use)
   */
  async requestLocationPermission(): Promise<PermissionStatus> {
    logger.info(TAG, 'Requesting location permission');
    return this.requestPermission(PermissionType.LOCATION);
  }

  /**
   * Request background location permission (always)
   * Note: Should only be called after foreground permission is granted
   */
  async requestBackgroundLocationPermission(): Promise<PermissionStatus> {
    logger.info(TAG, 'Requesting background location permission');

    // Check if foreground location is granted first
    const foregroundStatus = await this.checkPermission(PermissionType.LOCATION);
    if (!foregroundStatus.granted) {
      logger.warn(TAG, 'Foreground location not granted, cannot request background');
      Alert.alert(
        'Permission Required',
        'Please grant location access first before enabling background location.',
      );
      return {type: PermissionType.LOCATION_ALWAYS, granted: false, canAskAgain: true};
    }

    return this.requestPermission(PermissionType.LOCATION_ALWAYS);
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<PermissionStatus> {
    logger.info(TAG, 'Requesting notification permission');
    return this.requestPermission(PermissionType.NOTIFICATIONS);
  }

  /**
   * Request contacts permission (optional feature)
   */
  async requestContactsPermission(): Promise<PermissionStatus> {
    logger.info(TAG, 'Requesting contacts permission');
    return this.requestPermission(PermissionType.CONTACTS);
  }

  /**
   * Check all required permissions
   */
  async checkAllPermissions(): Promise<Record<PermissionType, PermissionStatus>> {
    logger.info(TAG, 'Checking all permissions');

    const results = await Promise.all([
      this.checkPermission(PermissionType.LOCATION),
      this.checkPermission(PermissionType.LOCATION_ALWAYS),
      this.checkPermission(PermissionType.NOTIFICATIONS),
      this.checkPermission(PermissionType.CONTACTS),
    ]);

    return {
      [PermissionType.LOCATION]: results[0],
      [PermissionType.LOCATION_ALWAYS]: results[1],
      [PermissionType.NOTIFICATIONS]: results[2],
      [PermissionType.CONTACTS]: results[3],
    };
  }

  /**
   * Request all essential permissions in sequence
   */
  async requestEssentialPermissions(): Promise<{
    location: PermissionStatus;
    notifications: PermissionStatus;
    backgroundLocation: PermissionStatus;
  }> {
    logger.info(TAG, 'Requesting essential permissions');

    // Request location first
    const location = await this.requestLocationPermission();

    // Request notifications
    const notifications = await this.requestNotificationPermission();

    // Request background location if foreground is granted
    let backgroundLocation: PermissionStatus = {
      type: PermissionType.LOCATION_ALWAYS,
      granted: false,
      canAskAgain: false,
    };

    if (location.granted) {
      backgroundLocation = await this.requestBackgroundLocationPermission();
    }

    return {
      location,
      notifications,
      backgroundLocation,
    };
  }

  /**
   * Show alert when permission is blocked
   */
  private showPermissionBlockedAlert(type: PermissionType): void {
    const permissionName = this.getPermissionDisplayName(type);

    Alert.alert(
      'Permission Required',
      `${permissionName} access is required for this feature. Please enable it in Settings.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Open Settings',
          onPress: () => openSettings(),
        },
      ],
    );
  }

  /**
   * Get user-friendly permission name
   */
  private getPermissionDisplayName(type: PermissionType): string {
    switch (type) {
      case PermissionType.LOCATION:
        return 'Location';
      case PermissionType.LOCATION_ALWAYS:
        return 'Background Location';
      case PermissionType.NOTIFICATIONS:
        return 'Notification';
      case PermissionType.CONTACTS:
        return 'Contacts';
      default:
        return 'Permission';
    }
  }

  /**
   * Open app settings
   */
  async openAppSettings(): Promise<void> {
    try {
      await openSettings();
    } catch (error) {
      logger.error(TAG, 'Error opening settings:', error);
    }
  }
}

export default new PermissionManager();

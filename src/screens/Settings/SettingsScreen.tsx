/**
 * Settings Screen
 * Manage app preferences and permissions
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  PreferencesStore,
  PermissionManager,
  LocationService,
  AudioPlayer,
  NotificationManager,
} from '../../services';
import {
  UserPreferences,
  NotificationFrequency,
  InterestCategory,
} from '../../types';
import {COLORS, INTEREST_DISPLAY_NAMES, UI_CONSTANTS, APP_VERSION} from '../../constants';
import {logger} from '../../utils';

const TAG = 'SettingsScreen';

const SettingsScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);

  /**
   * Load preferences
   */
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await PreferencesStore.getUserPreferences();
      setPreferences(prefs);

      const isLocationEnabled = await LocationService.isLocationEnabled();
      setLocationEnabled(isLocationEnabled);
    } catch (error) {
      logger.error(TAG, 'Error loading preferences:', error);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  /**
   * Update preference
   */
  const updatePreference = async (updates: Partial<UserPreferences>) => {
    try {
      const updated = await PreferencesStore.updateUserPreferences(updates);
      setPreferences(updated);
    } catch (error) {
      logger.error(TAG, 'Error updating preferences:', error);
    }
  };

  /**
   * Toggle interest
   */
  const toggleInterest = (interest: InterestCategory) => {
    if (!preferences) return;

    const newInterests = preferences.interests.includes(interest)
      ? preferences.interests.filter(i => i !== interest)
      : [...preferences.interests, interest];

    updatePreference({interests: newInterests});
  };

  /**
   * Toggle location tracking
   */
  const toggleLocationTracking = async (enabled: boolean) => {
    try {
      if (enabled) {
        const status = await PermissionManager.requestLocationPermission();
        if (status.granted) {
          await LocationService.start();
          updatePreference({
            privacySettings: {
              ...preferences!.privacySettings,
              locationTrackingEnabled: true,
            },
          });
          setLocationEnabled(true);
        }
      } else {
        await LocationService.stop();
        updatePreference({
          privacySettings: {
            ...preferences!.privacySettings,
            locationTrackingEnabled: false,
          },
        });
        setLocationEnabled(false);
      }
    } catch (error) {
      logger.error(TAG, 'Error toggling location tracking:', error);
    }
  };

  /**
   * Toggle notifications
   */
  const toggleNotifications = async (enabled: boolean) => {
    try {
      if (enabled) {
        const status = await PermissionManager.requestNotificationPermission();
        if (status.granted) {
          updatePreference({
            privacySettings: {
              ...preferences!.privacySettings,
              notificationsEnabled: true,
            },
          });
        }
      } else {
        updatePreference({
          privacySettings: {
            ...preferences!.privacySettings,
            notificationsEnabled: false,
          },
        });
      }
    } catch (error) {
      logger.error(TAG, 'Error toggling notifications:', error);
    }
  };

  /**
   * Change notification frequency
   */
  const changeNotificationFrequency = () => {
    if (!preferences) return;

    const frequencies: NotificationFrequency[] = [
      NotificationFrequency.LOW,
      NotificationFrequency.MEDIUM,
      NotificationFrequency.HIGH,
    ];

    const currentIndex = frequencies.indexOf(preferences.notificationFrequency);
    const nextIndex = (currentIndex + 1) % frequencies.length;

    updatePreference({notificationFrequency: frequencies[nextIndex]});
  };

  /**
   * Clear all data
   */
  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all voice notes, settings, and reset the app. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await PreferencesStore.clearAll();
              await AudioPlayer.reset();
              await NotificationManager.reset();
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              logger.error(TAG, 'Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ],
    );
  };

  if (!preferences) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Interests Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <Text style={styles.sectionDescription}>
            Select topics you're interested in for personalized voice notes
          </Text>

          <View style={styles.interestsGrid}>
            {Object.values(InterestCategory).map(interest => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestChip,
                  preferences.interests.includes(interest) &&
                    styles.interestChipSelected,
                ]}
                onPress={() => toggleInterest(interest)}>
                <Text
                  style={[
                    styles.interestChipText,
                    preferences.interests.includes(interest) &&
                      styles.interestChipTextSelected,
                  ]}>
                  {INTEREST_DISPLAY_NAMES[interest]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive alerts for new voice notes
              </Text>
            </View>
            <Switch
              value={preferences.privacySettings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
              thumbColor={
                preferences.privacySettings.notificationsEnabled
                  ? COLORS.primary
                  : COLORS.surface
              }
            />
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={changeNotificationFrequency}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notification Frequency</Text>
              <Text style={styles.settingDescription}>
                How often you receive notifications
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {preferences.notificationFrequency.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Playback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Play</Text>
              <Text style={styles.settingDescription}>
                Automatically play voice notes when triggered
              </Text>
            </View>
            <Switch
              value={preferences.playbackPreferences.autoPlay}
              onValueChange={enabled =>
                updatePreference({
                  playbackPreferences: {
                    ...preferences.playbackPreferences,
                    autoPlay: enabled,
                  },
                })
              }
              trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
              thumbColor={
                preferences.playbackPreferences.autoPlay
                  ? COLORS.primary
                  : COLORS.surface
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Require Earphones</Text>
              <Text style={styles.settingDescription}>
                Only play when earphones are connected
              </Text>
            </View>
            <Switch
              value={preferences.playbackPreferences.requireEarphones}
              onValueChange={enabled =>
                updatePreference({
                  playbackPreferences: {
                    ...preferences.playbackPreferences,
                    requireEarphones: enabled,
                  },
                })
              }
              trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
              thumbColor={
                preferences.playbackPreferences.requireEarphones
                  ? COLORS.primary
                  : COLORS.surface
              }
            />
          </View>
        </View>

        {/* CarPlay & Driving Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CarPlay & Driving</Text>
          <Text style={styles.sectionDescription}>
            Settings for in-car audio playback
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable CarPlay</Text>
              <Text style={styles.settingDescription}>
                Automatically play through car speakers when connected
              </Text>
            </View>
            <Switch
              value={preferences.carPlayPreferences.enableCarPlay}
              onValueChange={enabled =>
                updatePreference({
                  carPlayPreferences: {
                    ...preferences.carPlayPreferences,
                    enableCarPlay: enabled,
                  },
                })
              }
              trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
              thumbColor={
                preferences.carPlayPreferences.enableCarPlay
                  ? COLORS.primary
                  : COLORS.surface
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Play in Car</Text>
              <Text style={styles.settingDescription}>
                Automatically start playback when car is connected
              </Text>
            </View>
            <Switch
              value={preferences.carPlayPreferences.autoPlayInCar}
              onValueChange={enabled =>
                updatePreference({
                  carPlayPreferences: {
                    ...preferences.carPlayPreferences,
                    autoPlayInCar: enabled,
                  },
                })
              }
              trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
              thumbColor={
                preferences.carPlayPreferences.autoPlayInCar
                  ? COLORS.primary
                  : COLORS.surface
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Play Only When Stationary</Text>
              <Text style={styles.settingDescription}>
                Only play voice notes when vehicle is not moving
              </Text>
            </View>
            <Switch
              value={preferences.carPlayPreferences.playOnlyWhenStationary}
              onValueChange={enabled =>
                updatePreference({
                  carPlayPreferences: {
                    ...preferences.carPlayPreferences,
                    playOnlyWhenStationary: enabled,
                  },
                })
              }
              trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
              thumbColor={
                preferences.carPlayPreferences.playOnlyWhenStationary
                  ? COLORS.primary
                  : COLORS.surface
              }
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Location Tracking</Text>
              <Text style={styles.settingDescription}>
                Enable location-based triggers
              </Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={toggleLocationTracking}
              trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
              thumbColor={locationEnabled ? COLORS.primary : COLORS.surface}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Share Usage Data</Text>
              <Text style={styles.settingDescription}>
                Help improve Bisik by sharing anonymous usage data
              </Text>
            </View>
            <Switch
              value={preferences.privacySettings.shareUsageData}
              onValueChange={enabled =>
                updatePreference({
                  privacySettings: {
                    ...preferences.privacySettings,
                    shareUsageData: enabled,
                  },
                })
              }
              trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
              thumbColor={
                preferences.privacySettings.shareUsageData
                  ? COLORS.primary
                  : COLORS.surface
              }
            />
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => PermissionManager.openAppSettings()}>
            <Icon name="settings-outline" size={20} color={COLORS.primary} />
            <Text style={styles.linkButtonText}>Manage App Permissions</Text>
            <Icon name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValue}>{APP_VERSION}</Text>
          </View>

          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Icon name="trash-outline" size={20} color={COLORS.error} />
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  interestChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  interestChipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  interestChipTextSelected: {
    color: COLORS.onPrimary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  linkButtonText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: UI_CONSTANTS.BUTTON_BORDER_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginTop: 16,
  },
  dangerButtonText: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: '600',
  },
});

export default SettingsScreen;

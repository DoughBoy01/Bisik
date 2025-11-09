/**
 * Bisik - Personal Voice Note Companion
 * Main application entry point
 */

import React, {useEffect, useState} from 'react';
import {StatusBar, Alert} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import {
  PreferencesStore,
  LocationService,
  ScheduleService,
  NotificationManager,
  AudioPlayer,
  CarPlayService,
  ContactsService,
  SocialService,
} from './src/services';
import {COLORS} from './src/constants';
import {logger} from './src/utils';

const TAG = 'App';

const App: React.FC = () => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize app services
   */
  const initializeServices = async () => {
    try {
      logger.info(TAG, 'Initializing app services');

      // Initialize NotificationManager first
      await NotificationManager.initialize();
      logger.info(TAG, 'NotificationManager initialized');

      // Initialize ScheduleService
      await ScheduleService.initialize();
      logger.info(TAG, 'ScheduleService initialized');

      // Initialize LocationService
      await LocationService.initialize();
      logger.info(TAG, 'LocationService initialized');

      // Initialize CarPlayService
      await CarPlayService.initialize();
      logger.info(TAG, 'CarPlayService initialized');

      // Initialize ContactsService
      await ContactsService.initialize();
      logger.info(TAG, 'ContactsService initialized');

      // Initialize SocialService
      await SocialService.initialize();
      logger.info(TAG, 'SocialService initialized');

      // Set up geofence event listener
      LocationService.onGeofenceEvent(event => {
        logger.info(TAG, `Geofence event: ${event.action} at ${event.identifier}`);

        // Show notification
        NotificationManager.showGeofenceNotification(event.identifier, event.action);

        // Optionally trigger voice note playback based on geofence
        // This would be implemented based on business logic
      });

      // Set up scheduled trigger listener
      ScheduleService.onTrigger(trigger => {
        logger.info(TAG, `Scheduled trigger fired: ${trigger.id}`);

        // This is where you would load and play the voice note
        // For now, just log it
      });

      // Load saved geofences and start location tracking if enabled
      const preferences = await PreferencesStore.getUserPreferences();
      if (preferences.privacySettings.locationTrackingEnabled) {
        const geofences = await PreferencesStore.getGeofences();
        if (geofences.length > 0) {
          await LocationService.addGeofences(geofences);
          await LocationService.start();
          logger.info(TAG, `Location tracking started with ${geofences.length} geofences`);
        }
      }

      // Load saved scheduled triggers
      const triggers = await PreferencesStore.getScheduledTriggers();
      for (const trigger of triggers) {
        if (trigger.enabled) {
          await ScheduleService.addTrigger(trigger);
        }
      }
      logger.info(TAG, `Loaded ${triggers.length} scheduled triggers`);

      logger.info(TAG, 'All services initialized successfully');
    } catch (error) {
      logger.error(TAG, 'Error initializing services:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize some app services. Some features may not work correctly.',
      );
    }
  };

  /**
   * Check onboarding status and initialize app
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if onboarding is complete
        const onboardingComplete = await PreferencesStore.isOnboardingCompleted();
        setIsOnboardingComplete(onboardingComplete);

        // Initialize services
        await initializeServices();

        setIsInitialized(true);
      } catch (error) {
        logger.error(TAG, 'Error initializing app:', error);
        setIsInitialized(true); // Still mark as initialized to avoid indefinite loading
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      logger.info(TAG, 'App unmounting, cleaning up services');
      LocationService.stop().catch(err => logger.error(TAG, 'Error stopping LocationService:', err));
      ScheduleService.stop().catch(err => logger.error(TAG, 'Error stopping ScheduleService:', err));
      CarPlayService.stop();
      SocialService.stop();
    };
  }, []);

  /**
   * Listen for onboarding completion
   */
  useEffect(() => {
    const checkOnboarding = setInterval(async () => {
      const onboardingComplete = await PreferencesStore.isOnboardingCompleted();
      if (onboardingComplete !== isOnboardingComplete) {
        setIsOnboardingComplete(onboardingComplete);
      }
    }, 1000);

    return () => clearInterval(checkOnboarding);
  }, [isOnboardingComplete]);

  if (!isInitialized) {
    // You could show a splash screen here
    return null;
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />
      <AppNavigator isOnboardingComplete={isOnboardingComplete} />
    </>
  );
};

export default App;

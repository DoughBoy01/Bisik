/**
 * Onboarding Screen
 * Guides users through initial setup and permissions
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {PermissionManager, PreferencesStore} from '../../services';
import {InterestCategory, PermissionType} from '../../types';
import {COLORS, INTEREST_DISPLAY_NAMES, UI_CONSTANTS} from '../../constants';
import {logger} from '../../utils';

const TAG = 'OnboardingScreen';

enum OnboardingStep {
  WELCOME = 0,
  INTERESTS = 1,
  PERMISSIONS = 2,
  COMPLETE = 3,
}

const OnboardingScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(OnboardingStep.WELCOME);
  const [selectedInterests, setSelectedInterests] = useState<InterestCategory[]>([]);
  const [permissionsGranted, setPermissionsGranted] = useState({
    location: false,
    notifications: false,
    backgroundLocation: false,
    contacts: false,
  });

  /**
   * Handle interest selection
   */
  const toggleInterest = (interest: InterestCategory) => {
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      } else {
        return [...prev, interest];
      }
    });
  };

  /**
   * Handle permissions request
   */
  const requestPermissions = async () => {
    try {
      logger.info(TAG, 'Requesting permissions');

      const results = await PermissionManager.requestEssentialPermissions();

      // Also request contacts permission (optional for social features)
      const contactsPermission = await PermissionManager.checkPermission(
        PermissionType.CONTACTS,
      );
      let contactsGranted = contactsPermission.granted;

      if (!contactsGranted) {
        const contactsResult = await PermissionManager.requestContactsPermission();
        contactsGranted = contactsResult.granted;
      }

      setPermissionsGranted({
        location: results.location.granted,
        notifications: results.notifications.granted,
        backgroundLocation: results.backgroundLocation.granted,
        contacts: contactsGranted,
      });

      await PreferencesStore.setPermissionsRequested(true);

      if (results.location.granted && results.notifications.granted) {
        logger.info(TAG, 'Essential permissions granted');
        setCurrentStep(OnboardingStep.COMPLETE);
      } else {
        Alert.alert(
          'Permissions Required',
          'Bisik needs location and notification permissions to function properly. Please enable them in Settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Open Settings',
              onPress: () => PermissionManager.openAppSettings(),
            },
          ],
        );
      }
    } catch (error) {
      logger.error(TAG, 'Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    }
  };

  /**
   * Complete onboarding
   */
  const completeOnboarding = async () => {
    try {
      logger.info(TAG, 'Completing onboarding');

      // Save user preferences
      const preferences = await PreferencesStore.getUserPreferences();
      preferences.interests = selectedInterests;
      await PreferencesStore.setUserPreferences(preferences);

      // Mark onboarding as complete
      await PreferencesStore.setOnboardingCompleted(true);

      logger.info(TAG, 'Onboarding completed');
      // Navigation will automatically update when onboarding status changes
    } catch (error) {
      logger.error(TAG, 'Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
    }
  };

  /**
   * Render welcome step
   */
  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="volume-high" size={100} color={COLORS.primary} />
      <Text style={styles.title}>Welcome to Bisik</Text>
      <Text style={styles.description}>
        Your personal AI companion that delivers curated voice notes based on your location
        and schedule.
      </Text>
      <Text style={styles.description}>
        Get timely reminders and interesting information when and where you need it most.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setCurrentStep(OnboardingStep.INTERESTS)}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render interests selection step
   */
  const renderInterestsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>What interests you?</Text>
      <Text style={styles.description}>
        Select your areas of interest to personalize your voice notes.
      </Text>

      <ScrollView style={styles.interestsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.interestsGrid}>
          {Object.values(InterestCategory).map(interest => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.interestChip,
                selectedInterests.includes(interest) && styles.interestChipSelected,
              ]}
              onPress={() => toggleInterest(interest)}>
              <Text
                style={[
                  styles.interestChipText,
                  selectedInterests.includes(interest) &&
                    styles.interestChipTextSelected,
                ]}>
                {INTEREST_DISPLAY_NAMES[interest]}
              </Text>
              {selectedInterests.includes(interest) && (
                <Icon name="checkmark-circle" size={20} color={COLORS.onPrimary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          selectedInterests.length === 0 && styles.primaryButtonDisabled,
        ]}
        disabled={selectedInterests.length === 0}
        onPress={() => setCurrentStep(OnboardingStep.PERMISSIONS)}>
        <Text style={styles.primaryButtonText}>
          Continue ({selectedInterests.length} selected)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setCurrentStep(OnboardingStep.WELCOME)}>
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render permissions step
   */
  const renderPermissionsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Enable Permissions</Text>
      <Text style={styles.description}>
        Bisik needs these permissions to deliver voice notes at the right time and place.
      </Text>

      <View style={styles.permissionsContainer}>
        <View style={styles.permissionItem}>
          <Icon
            name="location"
            size={32}
            color={permissionsGranted.location ? COLORS.success : COLORS.textSecondary}
          />
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>Location Access</Text>
            <Text style={styles.permissionDescription}>
              To trigger voice notes when you arrive at specific places
            </Text>
          </View>
          {permissionsGranted.location && (
            <Icon name="checkmark-circle" size={24} color={COLORS.success} />
          )}
        </View>

        <View style={styles.permissionItem}>
          <Icon
            name="notifications"
            size={32}
            color={permissionsGranted.notifications ? COLORS.success : COLORS.textSecondary}
          />
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>Notifications</Text>
            <Text style={styles.permissionDescription}>
              To alert you when new voice notes are available
            </Text>
          </View>
          {permissionsGranted.notifications && (
            <Icon name="checkmark-circle" size={24} color={COLORS.success} />
          )}
        </View>

        <View style={styles.permissionItem}>
          <Icon
            name="navigate"
            size={32}
            color={
              permissionsGranted.backgroundLocation ? COLORS.success : COLORS.textSecondary
            }
          />
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>Background Location</Text>
            <Text style={styles.permissionDescription}>
              To track your location even when the app is closed
            </Text>
          </View>
          {permissionsGranted.backgroundLocation && (
            <Icon name="checkmark-circle" size={24} color={COLORS.success} />
          )}
        </View>

        <View style={styles.permissionItem}>
          <Icon
            name="people"
            size={32}
            color={permissionsGranted.contacts ? COLORS.success : COLORS.textSecondary}
          />
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>Contacts (Optional)</Text>
            <Text style={styles.permissionDescription}>
              For social features like meeting up with nearby friends
            </Text>
          </View>
          {permissionsGranted.contacts && (
            <Icon name="checkmark-circle" size={24} color={COLORS.success} />
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={requestPermissions}>
        <Text style={styles.primaryButtonText}>Grant Permissions</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setCurrentStep(OnboardingStep.INTERESTS)}>
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render complete step
   */
  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="checkmark-circle" size={100} color={COLORS.success} />
      <Text style={styles.title}>You're All Set!</Text>
      <Text style={styles.description}>
        Bisik is ready to deliver personalized voice notes based on your interests and
        location.
      </Text>
      <Text style={styles.description}>
        You can customize your preferences anytime in Settings.
      </Text>

      <TouchableOpacity style={styles.primaryButton} onPress={completeOnboarding}>
        <Text style={styles.primaryButtonText}>Start Using Bisik</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render current step
   */
  const renderCurrentStep = () => {
    switch (currentStep) {
      case OnboardingStep.WELCOME:
        return renderWelcomeStep();
      case OnboardingStep.INTERESTS:
        return renderInterestsStep();
      case OnboardingStep.PERMISSIONS:
        return renderPermissionsStep();
      case OnboardingStep.COMPLETE:
        return renderCompleteStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressBar}>
        {[0, 1, 2, 3].map(step => (
          <View
            key={step}
            style={[
              styles.progressStep,
              step <= currentStep && styles.progressStepActive,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: COLORS.primary,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: UI_CONSTANTS.BUTTON_BORDER_RADIUS,
    marginTop: 32,
    minWidth: 200,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.divider,
  },
  primaryButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  interestsContainer: {
    flex: 1,
    width: '100%',
    marginVertical: 24,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
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
  permissionsContainer: {
    width: '100%',
    marginVertical: 24,
    gap: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: UI_CONSTANTS.CARD_BORDER_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default OnboardingScreen;

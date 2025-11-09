/**
 * Social Service
 * Generates proximity-based social suggestions and activity recommendations
 */

import {
  BisikUser,
  SocialSuggestion,
  SuggestionType,
  UserActivity,
  PlaceType,
} from '../types';
import {SOCIAL_CONFIG} from '../constants';
import {logger, generateId, calculateDistance} from '../utils';
import ContactsService from './ContactsService';
import LocationService from './LocationService';
import PreferencesStore from './PreferencesStore';
import NotificationManager from './NotificationManager';

const TAG = 'SocialService';

type SuggestionCallback = (suggestion: SocialSuggestion) => void;

class SocialService {
  private suggestions: SocialSuggestion[] = [];
  private suggestionCallbacks: SuggestionCallback[] = [];
  private checkIntervalId: NodeJS.Timeout | null = null;

  /**
   * Initialize the social service
   */
  async initialize(): Promise<void> {
    try {
      logger.info(TAG, 'Initializing SocialService');

      // Load cached suggestions
      await this.loadSuggestions();

      // Start periodic check for new suggestions
      this.startPeriodicCheck();

      logger.info(TAG, 'SocialService initialized successfully');
    } catch (error) {
      logger.error(TAG, 'Error initializing SocialService:', error);
      throw error;
    }
  }

  /**
   * Start periodic checking for new suggestions
   */
  private startPeriodicCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    this.checkIntervalId = setInterval(() => {
      this.checkForSuggestions();
    }, SOCIAL_CONFIG.SUGGESTION_CHECK_INTERVAL);

    logger.debug(TAG, 'Periodic suggestion check started');
  }

  /**
   * Stop periodic checking
   */
  private stopPeriodicCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      logger.debug(TAG, 'Periodic suggestion check stopped');
    }
  }

  /**
   * Check for new social suggestions
   */
  private async checkForSuggestions(): Promise<void> {
    try {
      // Get user preferences
      const preferences = await PreferencesStore.getUserPreferences();

      if (!preferences.socialPreferences.enableSocialFeatures) {
        return;
      }

      if (!preferences.socialPreferences.allowSuggestions) {
        return;
      }

      // Check quiet hours
      if (this.isQuietHours(preferences.socialPreferences.quietHours)) {
        logger.debug(TAG, 'Skipping suggestions during quiet hours');
        return;
      }

      // Get current location
      const currentLocation = await LocationService.getCurrentPosition();
      if (!currentLocation) {
        logger.debug(TAG, 'Could not get current location');
        return;
      }

      // Get Bisik users
      const bisikUsers = ContactsService.getBisikUsers();

      // Generate suggestions based on proximity and activity
      for (const user of bisikUsers) {
        if (!user.lastLocation || !user.preferences.shareLocation) {
          continue;
        }

        const distance = calculateDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          user.lastLocation.latitude,
          user.lastLocation.longitude,
        );

        // Check if user is within suggestion radius
        if (distance <= preferences.socialPreferences.suggestionRadius) {
          await this.generateSuggestion(user, distance, currentLocation);
        }
      }

      // Clean up expired suggestions
      this.cleanupExpiredSuggestions();
    } catch (error) {
      logger.error(TAG, 'Error checking for suggestions:', error);
    }
  }

  /**
   * Generate a suggestion based on user proximity and activity
   */
  private async generateSuggestion(
    user: BisikUser,
    distance: number,
    currentLocation: any,
  ): Promise<void> {
    // Check if we already have an active suggestion for this user
    if (this.hasActiveSuggestion(user.id)) {
      return;
    }

    // Check if we're at max active suggestions
    if (this.getActiveSuggestionsCount() >= SOCIAL_CONFIG.MAX_ACTIVE_SUGGESTIONS) {
      return;
    }

    let suggestion: SocialSuggestion | null = null;

    // Generate suggestion based on user's activity
    switch (user.currentActivity) {
      case UserActivity.RUNNING:
        suggestion = this.generateActivitySuggestion(user, distance, 'running');
        break;

      case UserActivity.AT_GYM:
        suggestion = this.generateActivitySuggestion(user, distance, 'gym');
        break;

      case UserActivity.AT_CAFE:
        suggestion = this.generateCafeSuggestion(user, distance);
        break;

      case UserActivity.AT_RESTAURANT:
        suggestion = this.generateRestaurantSuggestion(user, distance);
        break;

      default:
        // General proximity suggestion
        if (distance < SOCIAL_CONFIG.NEARBY_DISTANCE_THRESHOLD) {
          suggestion = this.generateProximitySuggestion(user, distance);
        }
    }

    if (suggestion) {
      await this.addSuggestion(suggestion);
    }
  }

  /**
   * Generate activity-based suggestion (e.g., "Dave just finished a run")
   */
  private generateActivitySuggestion(
    user: BisikUser,
    distance: number,
    activity: string,
  ): SocialSuggestion {
    const roundedDistance = Math.round(distance);

    // Example: "Dave has just finished a run close to you..."
    return {
      id: generateId(),
      type: SuggestionType.SHARED_ACTIVITY,
      priority: 'medium',
      user,
      title: `${user.name} nearby after ${activity}`,
      message: `${user.name} has just finished ${activity === 'gym' ? 'at the gym' : 'a ' + activity} ${roundedDistance}m away. Want to meet up?`,
      context: {
        distance,
        activity: user.currentActivity,
      },
      expiresAt: new Date(Date.now() + SOCIAL_CONFIG.SUGGESTION_EXPIRY_TIME),
      createdAt: new Date(),
      actioned: false,
      dismissed: false,
    };
  }

  /**
   * Generate cafe meetup suggestion with special offers
   */
  private generateCafeSuggestion(
    user: BisikUser,
    distance: number,
  ): SocialSuggestion {
    const roundedDistance = Math.round(distance);
    const placeName = user.lastLocation?.placeName || 'a cafe';

    // Example: "Dave is at Starbucks that has a 2 for 1 offer..."
    return {
      id: generateId(),
      type: SuggestionType.MEETUP_OPPORTUNITY,
      priority: 'high',
      user,
      title: `Coffee with ${user.name}?`,
      message: `${user.name} is at ${placeName} ${roundedDistance}m away. They have a 2 for 1 offer for the next 2 hours. Would you like to send them a message?`,
      context: {
        distance,
        placeName,
        placeType: PlaceType.CAFE,
        specialOffer: '2 for 1',
        timeLimit: 'for the next 2 hours',
      },
      expiresAt: new Date(Date.now() + 7200000), // 2 hours
      createdAt: new Date(),
      actioned: false,
      dismissed: false,
    };
  }

  /**
   * Generate restaurant suggestion
   */
  private generateRestaurantSuggestion(
    user: BisikUser,
    distance: number,
  ): SocialSuggestion {
    const roundedDistance = Math.round(distance);
    const placeName = user.lastLocation?.placeName || 'a restaurant';

    return {
      id: generateId(),
      type: SuggestionType.MEETUP_OPPORTUNITY,
      priority: 'high',
      user,
      title: `Join ${user.name} for a meal?`,
      message: `${user.name} is at ${placeName} ${roundedDistance}m away. Perfect timing to grab a bite together!`,
      context: {
        distance,
        placeName,
        placeType: PlaceType.RESTAURANT,
      },
      expiresAt: new Date(Date.now() + SOCIAL_CONFIG.SUGGESTION_EXPIRY_TIME),
      createdAt: new Date(),
      actioned: false,
      dismissed: false,
    };
  }

  /**
   * Generate general proximity suggestion
   */
  private generateProximitySuggestion(
    user: BisikUser,
    distance: number,
  ): SocialSuggestion {
    const roundedDistance = Math.round(distance);

    return {
      id: generateId(),
      type: SuggestionType.NEARBY_CONTACT,
      priority: 'low',
      user,
      title: `${user.name} is nearby`,
      message: `${user.name} is just ${roundedDistance}m away. Want to say hi?`,
      context: {
        distance,
      },
      expiresAt: new Date(Date.now() + SOCIAL_CONFIG.SUGGESTION_EXPIRY_TIME),
      createdAt: new Date(),
      actioned: false,
      dismissed: false,
    };
  }

  /**
   * Add a suggestion
   */
  private async addSuggestion(suggestion: SocialSuggestion): Promise<void> {
    try {
      this.suggestions.push(suggestion);
      await this.saveSuggestions();

      logger.info(TAG, `New suggestion: ${suggestion.title}`);

      // Notify callbacks
      this.notifyCallbacks(suggestion);

      // Show notification
      await NotificationManager.showNotification({
        id: suggestion.id,
        title: suggestion.title,
        message: suggestion.message,
        data: {type: 'social_suggestion', suggestionId: suggestion.id},
        priority: suggestion.priority as any,
      });
    } catch (error) {
      logger.error(TAG, 'Error adding suggestion:', error);
    }
  }

  /**
   * Get all active suggestions
   */
  getActiveSuggestions(): SocialSuggestion[] {
    return this.suggestions.filter(
      s => !s.dismissed && !s.actioned && new Date(s.expiresAt) > new Date(),
    );
  }

  /**
   * Get active suggestions count
   */
  private getActiveSuggestionsCount(): number {
    return this.getActiveSuggestions().length;
  }

  /**
   * Check if user has active suggestion
   */
  private hasActiveSuggestion(userId: string): boolean {
    return this.getActiveSuggestions().some(s => s.user.id === userId);
  }

  /**
   * Mark suggestion as actioned (user responded)
   */
  async actionSuggestion(suggestionId: string): Promise<void> {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.actioned = true;
      await this.saveSuggestions();
      logger.info(TAG, `Suggestion ${suggestionId} marked as actioned`);
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.dismissed = true;
      await this.saveSuggestions();
      logger.info(TAG, `Suggestion ${suggestionId} dismissed`);
    }
  }

  /**
   * Clean up expired suggestions
   */
  private async cleanupExpiredSuggestions(): Promise<void> {
    const now = new Date();
    const beforeCount = this.suggestions.length;

    this.suggestions = this.suggestions.filter(s => new Date(s.expiresAt) > now);

    if (this.suggestions.length < beforeCount) {
      await this.saveSuggestions();
      logger.debug(TAG, `Cleaned up ${beforeCount - this.suggestions.length} expired suggestions`);
    }
  }

  /**
   * Check if currently in quiet hours
   */
  private isQuietHours(quietHours: {enabled: boolean; startTime: string; endTime: string}): boolean {
    if (!quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return currentTime >= quietHours.startTime || currentTime < quietHours.endTime;
  }

  /**
   * Save suggestions to storage
   */
  private async saveSuggestions(): Promise<void> {
    try {
      await PreferencesStore.setSocialSuggestions(this.suggestions);
    } catch (error) {
      logger.error(TAG, 'Error saving suggestions:', error);
    }
  }

  /**
   * Load suggestions from storage
   */
  private async loadSuggestions(): Promise<void> {
    try {
      this.suggestions = await PreferencesStore.getSocialSuggestions();
      logger.debug(TAG, `Loaded ${this.suggestions.length} suggestions`);
    } catch (error) {
      logger.error(TAG, 'Error loading suggestions:', error);
    }
  }

  /**
   * Subscribe to new suggestions
   */
  onSuggestion(callback: SuggestionCallback): () => void {
    this.suggestionCallbacks.push(callback);

    return () => {
      const index = this.suggestionCallbacks.indexOf(callback);
      if (index > -1) {
        this.suggestionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify callbacks of new suggestion
   */
  private notifyCallbacks(suggestion: SocialSuggestion): void {
    this.suggestionCallbacks.forEach(callback => {
      try {
        callback(suggestion);
      } catch (error) {
        logger.error(TAG, 'Error in suggestion callback:', error);
      }
    });
  }

  /**
   * Stop the service
   */
  stop(): void {
    logger.info(TAG, 'Stopping SocialService');
    this.stopPeriodicCheck();
  }

  /**
   * Reset the service
   */
  async reset(): Promise<void> {
    logger.info(TAG, 'Resetting SocialService');
    this.stop();
    this.suggestions = [];
    this.suggestionCallbacks = [];
    await this.saveSuggestions();
  }
}

export default new SocialService();

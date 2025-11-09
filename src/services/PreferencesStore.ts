/**
 * Preferences Store
 * Manages persistent storage of user preferences and app data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserPreferences,
  VoiceNote,
  GeofenceRegion,
  ScheduledTrigger,
} from '../types';
import {STORAGE_KEYS, DEFAULT_PREFERENCES} from '../constants';
import {logger} from '../utils';

const TAG = 'PreferencesStore';

class PreferencesStore {
  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (value !== null) {
        const preferences = JSON.parse(value);
        logger.debug(TAG, 'Retrieved user preferences');
        return preferences;
      }
      logger.debug(TAG, 'No user preferences found, returning defaults');
      return DEFAULT_PREFERENCES;
    } catch (error) {
      logger.error(TAG, 'Error getting user preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Save user preferences
   */
  async setUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const value = JSON.stringify(preferences);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, value);
      logger.info(TAG, 'User preferences saved');
    } catch (error) {
      logger.error(TAG, 'Error saving user preferences:', error);
      throw error;
    }
  }

  /**
   * Update specific preference fields
   */
  async updateUserPreferences(
    updates: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    try {
      const currentPreferences = await this.getUserPreferences();
      const updatedPreferences = {...currentPreferences, ...updates};
      await this.setUserPreferences(updatedPreferences);
      logger.info(TAG, 'User preferences updated');
      return updatedPreferences;
    } catch (error) {
      logger.error(TAG, 'Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Get all voice notes
   */
  async getVoiceNotes(): Promise<VoiceNote[]> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_NOTES);
      if (value !== null) {
        const voiceNotes = JSON.parse(value, this.dateReviver);
        logger.debug(TAG, `Retrieved ${voiceNotes.length} voice notes`);
        return voiceNotes;
      }
      logger.debug(TAG, 'No voice notes found');
      return [];
    } catch (error) {
      logger.error(TAG, 'Error getting voice notes:', error);
      return [];
    }
  }

  /**
   * Save voice notes
   */
  async setVoiceNotes(voiceNotes: VoiceNote[]): Promise<void> {
    try {
      const value = JSON.stringify(voiceNotes);
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE_NOTES, value);
      logger.info(TAG, `Saved ${voiceNotes.length} voice notes`);
    } catch (error) {
      logger.error(TAG, 'Error saving voice notes:', error);
      throw error;
    }
  }

  /**
   * Add a voice note
   */
  async addVoiceNote(voiceNote: VoiceNote): Promise<void> {
    try {
      const voiceNotes = await this.getVoiceNotes();
      voiceNotes.push(voiceNote);
      await this.setVoiceNotes(voiceNotes);
      logger.info(TAG, `Added voice note: ${voiceNote.id}`);
    } catch (error) {
      logger.error(TAG, 'Error adding voice note:', error);
      throw error;
    }
  }

  /**
   * Update a voice note
   */
  async updateVoiceNote(voiceNote: VoiceNote): Promise<void> {
    try {
      const voiceNotes = await this.getVoiceNotes();
      const index = voiceNotes.findIndex(vn => vn.id === voiceNote.id);
      if (index !== -1) {
        voiceNotes[index] = voiceNote;
        await this.setVoiceNotes(voiceNotes);
        logger.info(TAG, `Updated voice note: ${voiceNote.id}`);
      } else {
        logger.warn(TAG, `Voice note not found: ${voiceNote.id}`);
      }
    } catch (error) {
      logger.error(TAG, 'Error updating voice note:', error);
      throw error;
    }
  }

  /**
   * Delete a voice note
   */
  async deleteVoiceNote(voiceNoteId: string): Promise<void> {
    try {
      const voiceNotes = await this.getVoiceNotes();
      const filtered = voiceNotes.filter(vn => vn.id !== voiceNoteId);
      await this.setVoiceNotes(filtered);
      logger.info(TAG, `Deleted voice note: ${voiceNoteId}`);
    } catch (error) {
      logger.error(TAG, 'Error deleting voice note:', error);
      throw error;
    }
  }

  /**
   * Get a specific voice note by ID
   */
  async getVoiceNote(voiceNoteId: string): Promise<VoiceNote | undefined> {
    try {
      const voiceNotes = await this.getVoiceNotes();
      return voiceNotes.find(vn => vn.id === voiceNoteId);
    } catch (error) {
      logger.error(TAG, 'Error getting voice note:', error);
      return undefined;
    }
  }

  /**
   * Get all geofences
   */
  async getGeofences(): Promise<GeofenceRegion[]> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.GEOFENCES);
      if (value !== null) {
        const geofences = JSON.parse(value);
        logger.debug(TAG, `Retrieved ${geofences.length} geofences`);
        return geofences;
      }
      logger.debug(TAG, 'No geofences found');
      return [];
    } catch (error) {
      logger.error(TAG, 'Error getting geofences:', error);
      return [];
    }
  }

  /**
   * Save geofences
   */
  async setGeofences(geofences: GeofenceRegion[]): Promise<void> {
    try {
      const value = JSON.stringify(geofences);
      await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCES, value);
      logger.info(TAG, `Saved ${geofences.length} geofences`);
    } catch (error) {
      logger.error(TAG, 'Error saving geofences:', error);
      throw error;
    }
  }

  /**
   * Add a geofence
   */
  async addGeofence(geofence: GeofenceRegion): Promise<void> {
    try {
      const geofences = await this.getGeofences();
      geofences.push(geofence);
      await this.setGeofences(geofences);
      logger.info(TAG, `Added geofence: ${geofence.id}`);
    } catch (error) {
      logger.error(TAG, 'Error adding geofence:', error);
      throw error;
    }
  }

  /**
   * Delete a geofence
   */
  async deleteGeofence(geofenceId: string): Promise<void> {
    try {
      const geofences = await this.getGeofences();
      const filtered = geofences.filter(gf => gf.id !== geofenceId);
      await this.setGeofences(filtered);
      logger.info(TAG, `Deleted geofence: ${geofenceId}`);
    } catch (error) {
      logger.error(TAG, 'Error deleting geofence:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled triggers
   */
  async getScheduledTriggers(): Promise<ScheduledTrigger[]> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_TRIGGERS);
      if (value !== null) {
        const triggers = JSON.parse(value, this.dateReviver);
        logger.debug(TAG, `Retrieved ${triggers.length} scheduled triggers`);
        return triggers;
      }
      logger.debug(TAG, 'No scheduled triggers found');
      return [];
    } catch (error) {
      logger.error(TAG, 'Error getting scheduled triggers:', error);
      return [];
    }
  }

  /**
   * Save scheduled triggers
   */
  async setScheduledTriggers(triggers: ScheduledTrigger[]): Promise<void> {
    try {
      const value = JSON.stringify(triggers);
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULED_TRIGGERS, value);
      logger.info(TAG, `Saved ${triggers.length} scheduled triggers`);
    } catch (error) {
      logger.error(TAG, 'Error saving scheduled triggers:', error);
      throw error;
    }
  }

  /**
   * Add a scheduled trigger
   */
  async addScheduledTrigger(trigger: ScheduledTrigger): Promise<void> {
    try {
      const triggers = await this.getScheduledTriggers();
      triggers.push(trigger);
      await this.setScheduledTriggers(triggers);
      logger.info(TAG, `Added scheduled trigger: ${trigger.id}`);
    } catch (error) {
      logger.error(TAG, 'Error adding scheduled trigger:', error);
      throw error;
    }
  }

  /**
   * Delete a scheduled trigger
   */
  async deleteScheduledTrigger(triggerId: string): Promise<void> {
    try {
      const triggers = await this.getScheduledTriggers();
      const filtered = triggers.filter(t => t.id !== triggerId);
      await this.setScheduledTriggers(filtered);
      logger.info(TAG, `Deleted scheduled trigger: ${triggerId}`);
    } catch (error) {
      logger.error(TAG, 'Error deleting scheduled trigger:', error);
      throw error;
    }
  }

  /**
   * Check if onboarding is completed
   */
  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return value === 'true';
    } catch (error) {
      logger.error(TAG, 'Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  async setOnboardingCompleted(completed: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        completed ? 'true' : 'false',
      );
      logger.info(TAG, `Onboarding completed: ${completed}`);
    } catch (error) {
      logger.error(TAG, 'Error setting onboarding status:', error);
      throw error;
    }
  }

  /**
   * Check if permissions have been requested
   */
  async hasRequestedPermissions(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.PERMISSIONS_REQUESTED);
      return value === 'true';
    } catch (error) {
      logger.error(TAG, 'Error checking permissions requested status:', error);
      return false;
    }
  }

  /**
   * Mark permissions as requested
   */
  async setPermissionsRequested(requested: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PERMISSIONS_REQUESTED,
        requested ? 'true' : 'false',
      );
      logger.info(TAG, `Permissions requested: ${requested}`);
    } catch (error) {
      logger.error(TAG, 'Error setting permissions requested status:', error);
      throw error;
    }
  }

  /**
   * Get all contacts
   */
  async getContacts(): Promise<any[]> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (value !== null) {
        const contacts = JSON.parse(value, this.dateReviver);
        logger.debug(TAG, `Retrieved ${contacts.length} contacts`);
        return contacts;
      }
      return [];
    } catch (error) {
      logger.error(TAG, 'Error getting contacts:', error);
      return [];
    }
  }

  /**
   * Save contacts
   */
  async setContacts(contacts: any[]): Promise<void> {
    try {
      const value = JSON.stringify(contacts);
      await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, value);
      logger.info(TAG, `Saved ${contacts.length} contacts`);
    } catch (error) {
      logger.error(TAG, 'Error saving contacts:', error);
      throw error;
    }
  }

  /**
   * Get Bisik users
   */
  async getBisikUsers(): Promise<any[]> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.BISIK_USERS);
      if (value !== null) {
        const users = JSON.parse(value, this.dateReviver);
        logger.debug(TAG, `Retrieved ${users.length} Bisik users`);
        return users;
      }
      return [];
    } catch (error) {
      logger.error(TAG, 'Error getting Bisik users:', error);
      return [];
    }
  }

  /**
   * Save Bisik users
   */
  async setBisikUsers(users: any[]): Promise<void> {
    try {
      const value = JSON.stringify(users);
      await AsyncStorage.setItem(STORAGE_KEYS.BISIK_USERS, value);
      logger.info(TAG, `Saved ${users.length} Bisik users`);
    } catch (error) {
      logger.error(TAG, 'Error saving Bisik users:', error);
      throw error;
    }
  }

  /**
   * Get social suggestions
   */
  async getSocialSuggestions(): Promise<any[]> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_SUGGESTIONS);
      if (value !== null) {
        const suggestions = JSON.parse(value, this.dateReviver);
        logger.debug(TAG, `Retrieved ${suggestions.length} social suggestions`);
        return suggestions;
      }
      return [];
    } catch (error) {
      logger.error(TAG, 'Error getting social suggestions:', error);
      return [];
    }
  }

  /**
   * Save social suggestions
   */
  async setSocialSuggestions(suggestions: any[]): Promise<void> {
    try {
      const value = JSON.stringify(suggestions);
      await AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_SUGGESTIONS, value);
      logger.info(TAG, `Saved ${suggestions.length} social suggestions`);
    } catch (error) {
      logger.error(TAG, 'Error saving social suggestions:', error);
      throw error;
    }
  }

  /**
   * Get favorite contacts
   */
  async getFavoriteContacts(): Promise<string[]> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_CONTACTS);
      if (value !== null) {
        const favorites = JSON.parse(value);
        logger.debug(TAG, `Retrieved ${favorites.length} favorite contacts`);
        return favorites;
      }
      return [];
    } catch (error) {
      logger.error(TAG, 'Error getting favorite contacts:', error);
      return [];
    }
  }

  /**
   * Save favorite contacts
   */
  async setFavoriteContacts(contactIds: string[]): Promise<void> {
    try {
      const value = JSON.stringify(contactIds);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_CONTACTS, value);
      logger.info(TAG, `Saved ${contactIds.length} favorite contacts`);
    } catch (error) {
      logger.error(TAG, 'Error saving favorite contacts:', error);
      throw error;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    try {
      logger.warn(TAG, 'Clearing all stored data');
      await AsyncStorage.clear();
      logger.info(TAG, 'All data cleared');
    } catch (error) {
      logger.error(TAG, 'Error clearing all data:', error);
      throw error;
    }
  }

  /**
   * Clear specific storage key
   */
  async clearKey(key: string): Promise<void> {
    try {
      logger.info(TAG, `Clearing key: ${key}`);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error(TAG, `Error clearing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      logger.debug(TAG, `Retrieved ${keys.length} keys`);
      return keys;
    } catch (error) {
      logger.error(TAG, 'Error getting all keys:', error);
      return [];
    }
  }

  /**
   * Date reviver for JSON.parse to convert ISO strings to Date objects
   */
  private dateReviver(key: string, value: any): any {
    if (typeof value === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (datePattern.test(value)) {
        return new Date(value);
      }
    }
    return value;
  }
}

export default new PreferencesStore();

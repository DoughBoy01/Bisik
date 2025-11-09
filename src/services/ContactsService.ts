/**
 * Contacts Service
 * Manages phone contacts and Bisik users
 */

import Contacts from 'react-native-contacts';
import {Contact, PhoneNumber, EmailAddress, BisikUser} from '../types';
import {logger, generateId} from '../utils';
import PreferencesStore from './PreferencesStore';
import PermissionManager from './PermissionManager';
import {PermissionType} from '../types';

const TAG = 'ContactsService';

class ContactsService {
  private contacts: Contact[] = [];
  private bisikUsers: BisikUser[] = [];
  private favoriteContacts: Set<string> = new Set();

  /**
   * Initialize contacts service
   */
  async initialize(): Promise<void> {
    try {
      logger.info(TAG, 'Initializing ContactsService');

      // Load cached contacts and favorites
      await this.loadCachedContacts();
      await this.loadFavorites();

      logger.info(TAG, 'ContactsService initialized successfully');
    } catch (error) {
      logger.error(TAG, 'Error initializing ContactsService:', error);
      throw error;
    }
  }

  /**
   * Load all contacts from phone
   */
  async loadContacts(): Promise<Contact[]> {
    try {
      // Check permission first
      const permission = await PermissionManager.checkPermission(
        PermissionType.CONTACTS,
      );

      if (!permission.granted) {
        logger.warn(TAG, 'Contacts permission not granted');
        throw new Error('Contacts permission required');
      }

      logger.info(TAG, 'Loading contacts from phone');

      const rawContacts = await Contacts.getAll();
      logger.info(TAG, `Loaded ${rawContacts.length} contacts from phone`);

      // Map to our Contact interface
      this.contacts = rawContacts.map(contact => ({
        id: contact.recordID || generateId(),
        recordID: contact.recordID,
        givenName: contact.givenName || '',
        familyName: contact.familyName || '',
        displayName: contact.displayName || `${contact.givenName} ${contact.familyName}`.trim(),
        phoneNumbers: contact.phoneNumbers.map(phone => ({
          label: phone.label,
          number: phone.number,
        })),
        emailAddresses: contact.emailAddresses.map(email => ({
          label: email.label,
          email: email.email,
        })),
        thumbnailPath: contact.thumbnailPath,
        hasBisikApp: false, // Will be determined by backend
        isFavorite: this.favoriteContacts.has(contact.recordID),
      }));

      // Cache contacts
      await this.cacheContacts();

      return this.contacts;
    } catch (error) {
      logger.error(TAG, 'Error loading contacts:', error);
      throw error;
    }
  }

  /**
   * Request contacts permission and load contacts
   */
  async requestContactsAccess(): Promise<Contact[]> {
    try {
      logger.info(TAG, 'Requesting contacts access');

      const permission = await PermissionManager.requestContactsPermission();

      if (!permission.granted) {
        logger.warn(TAG, 'Contacts permission denied');
        throw new Error('Contacts permission denied');
      }

      return await this.loadContacts();
    } catch (error) {
      logger.error(TAG, 'Error requesting contacts access:', error);
      throw error;
    }
  }

  /**
   * Get all contacts
   */
  getAllContacts(): Contact[] {
    return [...this.contacts];
  }

  /**
   * Get contact by ID
   */
  getContact(contactId: string): Contact | undefined {
    return this.contacts.find(c => c.id === contactId || c.recordID === contactId);
  }

  /**
   * Search contacts by name
   */
  searchContacts(query: string): Contact[] {
    const lowerQuery = query.toLowerCase();
    return this.contacts.filter(
      contact =>
        contact.displayName.toLowerCase().includes(lowerQuery) ||
        contact.givenName.toLowerCase().includes(lowerQuery) ||
        (contact.familyName?.toLowerCase().includes(lowerQuery) ?? false),
    );
  }

  /**
   * Get favorite contacts
   */
  getFavoriteContacts(): Contact[] {
    return this.contacts.filter(contact => contact.isFavorite);
  }

  /**
   * Add contact to favorites
   */
  async addToFavorites(contactId: string): Promise<void> {
    try {
      this.favoriteContacts.add(contactId);

      const contact = this.getContact(contactId);
      if (contact) {
        contact.isFavorite = true;
      }

      await this.saveFavorites();
      logger.info(TAG, `Contact ${contactId} added to favorites`);
    } catch (error) {
      logger.error(TAG, 'Error adding to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove contact from favorites
   */
  async removeFromFavorites(contactId: string): Promise<void> {
    try {
      this.favoriteContacts.delete(contactId);

      const contact = this.getContact(contactId);
      if (contact) {
        contact.isFavorite = false;
      }

      await this.saveFavorites();
      logger.info(TAG, `Contact ${contactId} removed from favorites`);
    } catch (error) {
      logger.error(TAG, 'Error removing from favorites:', error);
      throw error;
    }
  }

  /**
   * Get Bisik users (contacts who have the app)
   */
  getBisikUsers(): BisikUser[] {
    return [...this.bisikUsers];
  }

  /**
   * Update Bisik users list from backend
   * This would typically sync with a backend API
   */
  async syncBisikUsers(users: BisikUser[]): Promise<void> {
    try {
      logger.info(TAG, `Syncing ${users.length} Bisik users`);

      this.bisikUsers = users;

      // Mark contacts that have Bisik app
      this.contacts.forEach(contact => {
        contact.hasBisikApp = this.bisikUsers.some(
          user => user.contactId === contact.id,
        );
      });

      await this.cacheBisikUsers();
      logger.info(TAG, 'Bisik users synced successfully');
    } catch (error) {
      logger.error(TAG, 'Error syncing Bisik users:', error);
      throw error;
    }
  }

  /**
   * Get Bisik user by contact ID
   */
  getBisikUserByContactId(contactId: string): BisikUser | undefined {
    return this.bisikUsers.find(user => user.contactId === contactId);
  }

  /**
   * Cache contacts to local storage
   */
  private async cacheContacts(): Promise<void> {
    try {
      await PreferencesStore.setContacts(this.contacts);
      logger.debug(TAG, 'Contacts cached');
    } catch (error) {
      logger.error(TAG, 'Error caching contacts:', error);
    }
  }

  /**
   * Load cached contacts
   */
  private async loadCachedContacts(): Promise<void> {
    try {
      this.contacts = await PreferencesStore.getContacts();
      logger.debug(TAG, `Loaded ${this.contacts.length} cached contacts`);
    } catch (error) {
      logger.error(TAG, 'Error loading cached contacts:', error);
    }
  }

  /**
   * Cache Bisik users
   */
  private async cacheBisikUsers(): Promise<void> {
    try {
      await PreferencesStore.setBisikUsers(this.bisikUsers);
      logger.debug(TAG, 'Bisik users cached');
    } catch (error) {
      logger.error(TAG, 'Error caching Bisik users:', error);
    }
  }

  /**
   * Save favorites to storage
   */
  private async saveFavorites(): Promise<void> {
    try {
      await PreferencesStore.setFavoriteContacts(Array.from(this.favoriteContacts));
      logger.debug(TAG, 'Favorites saved');
    } catch (error) {
      logger.error(TAG, 'Error saving favorites:', error);
    }
  }

  /**
   * Load favorites from storage
   */
  private async loadFavorites(): Promise<void> {
    try {
      const favorites = await PreferencesStore.getFavoriteContacts();
      this.favoriteContacts = new Set(favorites);
      logger.debug(TAG, `Loaded ${favorites.length} favorites`);
    } catch (error) {
      logger.error(TAG, 'Error loading favorites:', error);
    }
  }

  /**
   * Refresh contacts (reload from phone)
   */
  async refreshContacts(): Promise<Contact[]> {
    logger.info(TAG, 'Refreshing contacts');
    return await this.loadContacts();
  }

  /**
   * Check if contacts permission is granted
   */
  async hasPermission(): Promise<boolean> {
    const permission = await PermissionManager.checkPermission(PermissionType.CONTACTS);
    return permission.granted;
  }

  /**
   * Get contact count
   */
  getContactCount(): number {
    return this.contacts.length;
  }

  /**
   * Get Bisik users count
   */
  getBisikUsersCount(): number {
    return this.bisikUsers.length;
  }

  /**
   * Reset the service
   */
  async reset(): Promise<void> {
    logger.info(TAG, 'Resetting ContactsService');
    this.contacts = [];
    this.bisikUsers = [];
    this.favoriteContacts.clear();
  }
}

export default new ContactsService();

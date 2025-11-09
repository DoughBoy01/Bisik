/**
 * Voice Note Manager Service
 * Handles voice note downloads, caching, and playback management
 */

import RNFS from 'react-native-fs';
import {logger} from '../utils';
import {VoiceNote, PlaybackState} from '../types';
import AudioPlayer from './AudioPlayer';
import PreferencesStore from './PreferencesStore';
import NotificationManager from './NotificationManager';
import ApiClient from './ApiClient';

const TAG = 'VoiceNoteManager';

// Cache directory for voice notes
const VOICE_NOTES_DIR = `${RNFS.DocumentDirectoryPath}/voice-notes`;

// Cache configuration
const CACHE_CONFIG = {
  MAX_CACHE_SIZE_MB: 100, // Max 100MB of cached audio
  MAX_CACHE_AGE_DAYS: 7, // Delete files older than 7 days
  CLEANUP_INTERVAL: 3600000, // Clean up every hour
};

interface DownloadProgress {
  voiceNoteId: string;
  progress: number; // 0-100
  totalBytes: number;
  downloadedBytes: number;
}

type ProgressCallback = (progress: DownloadProgress) => void;

class VoiceNoteManager {
  private downloadQueue: VoiceNote[] = [];
  private currentDownload: VoiceNote | null = null;
  private isDownloading = false;
  private progressCallbacks: ProgressCallback[] = [];
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  /**
   * Initialize voice note manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info(TAG, 'Initializing voice note manager');

      // Create cache directory if it doesn't exist
      const dirExists = await RNFS.exists(VOICE_NOTES_DIR);
      if (!dirExists) {
        await RNFS.mkdir(VOICE_NOTES_DIR);
        logger.info(TAG, 'Created voice notes cache directory');
      }

      // Start cleanup timer
      this.startCleanupTimer();

      // Process any pending downloads
      await this.processPendingDownloads();

      logger.info(TAG, 'Voice note manager initialized');
    } catch (error) {
      logger.error(TAG, 'Failed to initialize voice note manager:', error);
      throw error;
    }
  }

  /**
   * Add voice note to download queue
   */
  async queueDownload(voiceNote: VoiceNote, priority: boolean = false): Promise<void> {
    logger.info(TAG, `Queuing voice note for download: ${voiceNote.id}`);

    // Check if already downloaded
    const localPath = await this.getLocalPath(voiceNote.id);
    const exists = await RNFS.exists(localPath);

    if (exists) {
      logger.info(TAG, `Voice note ${voiceNote.id} already cached`);
      voiceNote.audioUrl = `file://${localPath}`;
      return;
    }

    // Add to queue
    if (priority) {
      this.downloadQueue.unshift(voiceNote);
    } else {
      this.downloadQueue.push(voiceNote);
    }

    logger.debug(TAG, `Download queue size: ${this.downloadQueue.length}`);

    // Start processing queue
    this.processDownloadQueue();
  }

  /**
   * Process download queue
   */
  private async processDownloadQueue(): Promise<void> {
    if (this.isDownloading || this.downloadQueue.length === 0) {
      return;
    }

    this.isDownloading = true;

    while (this.downloadQueue.length > 0) {
      const voiceNote = this.downloadQueue.shift()!;
      this.currentDownload = voiceNote;

      try {
        await this.downloadVoiceNote(voiceNote);
      } catch (error) {
        logger.error(TAG, `Failed to download voice note ${voiceNote.id}:`, error);
      }
    }

    this.currentDownload = null;
    this.isDownloading = false;
  }

  /**
   * Download voice note from URL
   */
  private async downloadVoiceNote(voiceNote: VoiceNote): Promise<void> {
    logger.info(TAG, `Downloading voice note: ${voiceNote.id}`);

    const localPath = await this.getLocalPath(voiceNote.id);

    try {
      // Download file
      const downloadResult = await RNFS.downloadFile({
        fromUrl: voiceNote.audioUrl,
        toFile: localPath,
        progress: res => {
          const progress: DownloadProgress = {
            voiceNoteId: voiceNote.id,
            progress: (res.bytesWritten / res.contentLength) * 100,
            totalBytes: res.contentLength,
            downloadedBytes: res.bytesWritten,
          };

          this.notifyProgressCallbacks(progress);
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        logger.info(TAG, `Voice note ${voiceNote.id} downloaded successfully`);

        // Update voice note with local path
        voiceNote.audioUrl = `file://${localPath}`;
        await PreferencesStore.updateVoiceNote(voiceNote);

        // Check if auto-play is enabled
        await this.handleAutoPlay(voiceNote);
      } else {
        logger.error(TAG, `Download failed with status ${downloadResult.statusCode}`);
        throw new Error(`Download failed: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      logger.error(TAG, `Download error for ${voiceNote.id}:`, error);

      // Clean up partial download
      const exists = await RNFS.exists(localPath);
      if (exists) {
        await RNFS.unlink(localPath);
      }

      throw error;
    }
  }

  /**
   * Handle auto-play based on user preferences
   */
  private async handleAutoPlay(voiceNote: VoiceNote): Promise<void> {
    try {
      const preferences = await PreferencesStore.getUserPreferences();

      // Check if auto-play is enabled
      if (!preferences.playbackPreferences.autoPlay) {
        logger.debug(TAG, 'Auto-play disabled, sending notification');
        await NotificationManager.sendNotification({
          id: voiceNote.id,
          title: voiceNote.title,
          body: voiceNote.description || 'New voice note available',
          data: {voiceNoteId: voiceNote.id},
        });
        return;
      }

      // Check if earphones are required
      if (preferences.playbackPreferences.requireEarphones) {
        const earphonesConnected = AudioPlayer.areEarphonesConnected();
        const carPlayConnected = AudioPlayer.isCarPlay();

        if (!earphonesConnected && !carPlayConnected) {
          logger.debug(TAG, 'Earphones required but not connected, sending notification');
          await NotificationManager.sendNotification({
            id: voiceNote.id,
            title: 'New voice note ready',
            body: 'Connect earphones or CarPlay to listen',
            data: {voiceNoteId: voiceNote.id},
          });
          return;
        }
      }

      // Check if phone call is active
      if (AudioPlayer.isPhoneCall()) {
        logger.debug(TAG, 'Phone call active, deferring playback');
        await NotificationManager.sendNotification({
          id: voiceNote.id,
          title: voiceNote.title,
          body: 'Voice note ready when call ends',
          data: {voiceNoteId: voiceNote.id},
        });
        return;
      }

      // Check if another voice note is playing
      const playerState = AudioPlayer.getState();
      if (playerState.playbackState === PlaybackState.PLAYING) {
        logger.debug(TAG, 'Another voice note is playing, queueing');
        // TODO: Implement playback queue
        return;
      }

      // Auto-play the voice note
      logger.info(TAG, `Auto-playing voice note: ${voiceNote.id}`);
      await AudioPlayer.load(voiceNote);
      await AudioPlayer.play();

      // Mark as played
      await ApiClient.markVoiceNotePlayed(voiceNote.id);
    } catch (error) {
      logger.error(TAG, 'Error in auto-play handler:', error);
    }
  }

  /**
   * Get local file path for voice note
   */
  private async getLocalPath(voiceNoteId: string): Promise<string> {
    return `${VOICE_NOTES_DIR}/${voiceNoteId}.mp3`;
  }

  /**
   * Check if voice note is cached
   */
  async isCached(voiceNoteId: string): Promise<boolean> {
    const localPath = await this.getLocalPath(voiceNoteId);
    return RNFS.exists(localPath);
  }

  /**
   * Get cache size in bytes
   */
  private async getCacheSize(): Promise<number> {
    try {
      const files = await RNFS.readDir(VOICE_NOTES_DIR);
      let totalSize = 0;

      for (const file of files) {
        totalSize += parseInt(file.size, 10);
      }

      return totalSize;
    } catch (error) {
      logger.error(TAG, 'Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * Clean up old cached files
   */
  private async cleanupCache(): Promise<void> {
    try {
      logger.info(TAG, 'Starting cache cleanup');

      const files = await RNFS.readDir(VOICE_NOTES_DIR);
      const now = Date.now();
      const maxAge = CACHE_CONFIG.MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;

      let deletedCount = 0;
      let freedBytes = 0;

      for (const file of files) {
        const fileAge = now - new Date(file.mtime).getTime();

        if (fileAge > maxAge) {
          await RNFS.unlink(file.path);
          deletedCount++;
          freedBytes += parseInt(file.size, 10);
          logger.debug(TAG, `Deleted old file: ${file.name}`);
        }
      }

      // Check if cache size is still too large
      const cacheSize = await this.getCacheSize();
      const maxCacheBytes = CACHE_CONFIG.MAX_CACHE_SIZE_MB * 1024 * 1024;

      if (cacheSize > maxCacheBytes) {
        logger.warn(TAG, `Cache size (${cacheSize / 1024 / 1024}MB) exceeds limit, removing oldest files`);
        await this.trimCache(maxCacheBytes);
      }

      logger.info(
        TAG,
        `Cache cleanup complete: deleted ${deletedCount} files, freed ${freedBytes / 1024 / 1024}MB`,
      );
    } catch (error) {
      logger.error(TAG, 'Error during cache cleanup:', error);
    }
  }

  /**
   * Trim cache to specified size
   */
  private async trimCache(maxBytes: number): Promise<void> {
    try {
      const files = await RNFS.readDir(VOICE_NOTES_DIR);

      // Sort by modification time (oldest first)
      files.sort((a, b) => new Date(a.mtime).getTime() - new Date(b.mtime).getTime());

      let currentSize = await this.getCacheSize();

      for (const file of files) {
        if (currentSize <= maxBytes) {
          break;
        }

        const fileSize = parseInt(file.size, 10);
        await RNFS.unlink(file.path);
        currentSize -= fileSize;
        logger.debug(TAG, `Trimmed file: ${file.name} (${fileSize / 1024}KB)`);
      }
    } catch (error) {
      logger.error(TAG, 'Error trimming cache:', error);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    this.cleanupIntervalId = setInterval(() => {
      this.cleanupCache();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);

    logger.debug(TAG, 'Cleanup timer started');

    // Run cleanup immediately
    this.cleanupCache();
  }

  /**
   * Process pending downloads from storage
   */
  private async processPendingDownloads(): Promise<void> {
    try {
      const voiceNotes = await PreferencesStore.getVoiceNotes();

      for (const voiceNote of voiceNotes) {
        // Skip if already played or expired
        if (voiceNote.isPlayed || this.isExpired(voiceNote)) {
          continue;
        }

        // Queue for download if not cached
        const cached = await this.isCached(voiceNote.id);
        if (!cached && voiceNote.audioUrl.startsWith('http')) {
          await this.queueDownload(voiceNote);
        }
      }
    } catch (error) {
      logger.error(TAG, 'Error processing pending downloads:', error);
    }
  }

  /**
   * Check if voice note is expired
   */
  private isExpired(voiceNote: VoiceNote): boolean {
    if (!voiceNote.expiresAt) {
      return false;
    }

    return new Date(voiceNote.expiresAt) < new Date();
  }

  /**
   * Subscribe to download progress
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgressCallbacks(progress: DownloadProgress): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        logger.error(TAG, 'Error in progress callback:', error);
      }
    });
  }

  /**
   * Get download status
   */
  getStatus() {
    return {
      isDownloading: this.isDownloading,
      queueSize: this.downloadQueue.length,
      currentDownload: this.currentDownload,
    };
  }

  /**
   * Clear all cached voice notes
   */
  async clearCache(): Promise<void> {
    try {
      logger.info(TAG, 'Clearing all cached voice notes');

      const files = await RNFS.readDir(VOICE_NOTES_DIR);
      for (const file of files) {
        await RNFS.unlink(file.path);
      }

      logger.info(TAG, `Cleared ${files.length} cached files`);
    } catch (error) {
      logger.error(TAG, 'Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Clean up
   */
  async cleanup(): Promise<void> {
    logger.info(TAG, 'Cleaning up voice note manager');

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    this.downloadQueue = [];
    this.currentDownload = null;
    this.isDownloading = false;
    this.progressCallbacks = [];
  }
}

export default new VoiceNoteManager();

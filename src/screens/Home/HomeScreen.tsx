/**
 * Home Screen
 * Main screen displaying voice notes and playback controls
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {AudioPlayer, PreferencesStore} from '../../services';
import {VoiceNote, PlaybackState, AudioPlayerState} from '../../types';
import {COLORS, UI_CONSTANTS} from '../../constants';
import {logger, formatDuration, formatDate} from '../../utils';
import {SocialSuggestionsSection} from '../../components';

const TAG = 'HomeScreen';

const HomeScreen: React.FC = () => {
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [playerState, setPlayerState] = useState<AudioPlayerState>(AudioPlayer.getState());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load voice notes
   */
  const loadVoiceNotes = useCallback(async () => {
    try {
      logger.info(TAG, 'Loading voice notes');
      const notes = await PreferencesStore.getVoiceNotes();
      // Sort by most recent first
      notes.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setVoiceNotes(notes);
    } catch (error) {
      logger.error(TAG, 'Error loading voice notes:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Handle refresh
   */
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadVoiceNotes();
  }, [loadVoiceNotes]);

  /**
   * Subscribe to player state changes
   */
  useEffect(() => {
    const unsubscribe = AudioPlayer.onStateChange(state => {
      setPlayerState(state);
    });

    return unsubscribe;
  }, []);

  /**
   * Load voice notes on mount
   */
  useEffect(() => {
    loadVoiceNotes();
  }, [loadVoiceNotes]);

  /**
   * Play a voice note
   */
  const playVoiceNote = async (voiceNote: VoiceNote) => {
    try {
      logger.info(TAG, `Playing voice note: ${voiceNote.id}`);

      // If this note is already playing, pause it
      if (
        playerState.currentVoiceNote?.id === voiceNote.id &&
        playerState.playbackState === PlaybackState.PLAYING
      ) {
        await AudioPlayer.pause();
        return;
      }

      // If this note is paused, resume it
      if (
        playerState.currentVoiceNote?.id === voiceNote.id &&
        playerState.playbackState === PlaybackState.PAUSED
      ) {
        await AudioPlayer.play();
        return;
      }

      // Load and play new voice note
      await AudioPlayer.load(voiceNote);
      await AudioPlayer.play();

      // Mark as played
      voiceNote.isPlayed = true;
      voiceNote.playedAt = new Date();
      await PreferencesStore.updateVoiceNote(voiceNote);
      loadVoiceNotes();
    } catch (error) {
      logger.error(TAG, 'Error playing voice note:', error);
    }
  };

  /**
   * Stop playback
   */
  const stopPlayback = async () => {
    try {
      await AudioPlayer.stop();
    } catch (error) {
      logger.error(TAG, 'Error stopping playback:', error);
    }
  };

  /**
   * Render voice note item
   */
  const renderVoiceNoteItem = ({item}: {item: VoiceNote}) => {
    const isPlaying =
      playerState.currentVoiceNote?.id === item.id &&
      playerState.playbackState === PlaybackState.PLAYING;
    const isPaused =
      playerState.currentVoiceNote?.id === item.id &&
      playerState.playbackState === PlaybackState.PAUSED;
    const isLoading =
      playerState.currentVoiceNote?.id === item.id &&
      playerState.playbackState === PlaybackState.LOADING;

    return (
      <TouchableOpacity
        style={[
          styles.voiceNoteCard,
          (isPlaying || isPaused) && styles.voiceNoteCardActive,
        ]}
        onPress={() => playVoiceNote(item)}>
        <View style={styles.voiceNoteContent}>
          <View style={styles.voiceNoteHeader}>
            <Text style={styles.voiceNoteTitle}>{item.title}</Text>
            {!item.isPlayed && <View style={styles.unreadBadge} />}
          </View>

          {item.description && (
            <Text style={styles.voiceNoteDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.voiceNoteFooter}>
            <Text style={styles.voiceNoteDate}>{formatDate(new Date(item.createdAt))}</Text>
            <View style={styles.voiceNoteMeta}>
              <Icon name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.voiceNoteDuration}>{formatDuration(item.duration)}</Text>
            </View>
          </View>

          {item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.playButtonContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
              onPress={() => playVoiceNote(item)}>
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={24}
                color={isPlaying ? COLORS.onPrimary : COLORS.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render list header
   */
  const renderListHeader = () => {
    return <SocialSuggestionsSection />;
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="musical-notes-outline" size={80} color={COLORS.divider} />
      <Text style={styles.emptyStateTitle}>No Voice Notes Yet</Text>
      <Text style={styles.emptyStateDescription}>
        Voice notes will appear here when they're triggered by your location or schedule.
      </Text>
    </View>
  );

  /**
   * Render player controls (sticky footer)
   */
  const renderPlayerControls = () => {
    if (!playerState.currentVoiceNote) return null;

    const progress =
      playerState.duration > 0 ? playerState.currentTime / playerState.duration : 0;

    return (
      <View style={styles.playerControls}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {width: `${progress * 100}%`}]} />
        </View>

        <View style={styles.playerContent}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerTitle} numberOfLines={1}>
              {playerState.currentVoiceNote.title}
            </Text>
            <Text style={styles.playerTime}>
              {formatDuration(playerState.currentTime)} /{' '}
              {formatDuration(playerState.duration)}
            </Text>
          </View>

          <View style={styles.playerButtons}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={
                playerState.playbackState === PlaybackState.PLAYING
                  ? () => AudioPlayer.pause()
                  : () => AudioPlayer.play()
              }>
              <Icon
                name={
                  playerState.playbackState === PlaybackState.PLAYING
                    ? 'pause'
                    : 'play'
                }
                size={32}
                color={COLORS.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={stopPlayback}>
              <Icon name="stop" size={28} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.playerIndicators}>
            {playerState.isCarPlayConnected && (
              <View style={styles.indicator}>
                <Icon name="car" size={20} color={COLORS.info} />
              </View>
            )}
            {playerState.isEarphonesConnected && (
              <View style={styles.indicator}>
                <Icon name="headset" size={20} color={COLORS.success} />
              </View>
            )}
            {playerState.vehicleState === 'moving' && (
              <View style={styles.indicator}>
                <Icon name="speedometer" size={18} color={COLORS.warning} />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={voiceNotes}
        renderItem={renderVoiceNoteItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      />

      {renderPlayerControls()}
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  voiceNoteCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: UI_CONSTANTS.CARD_BORDER_RADIUS,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  voiceNoteCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  voiceNoteContent: {
    flex: 1,
    marginRight: 12,
  },
  voiceNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceNoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  voiceNoteDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  voiceNoteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceNoteDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  voiceNoteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceNoteDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  playButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: COLORS.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  playerControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.divider,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  playerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  playerTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  playerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerIndicators: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  indicator: {
    padding: 4,
  },
});

export default HomeScreen;

/**
 * Schedule Management Screen
 * Manage scheduled voice note triggers
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {PreferencesStore, ScheduleService} from '../../services';
import {ScheduledTrigger, RepeatPattern} from '../../types';
import {COLORS, UI_CONSTANTS} from '../../constants';
import {logger, formatTime, formatDate, generateId} from '../../utils';

const TAG = 'ScheduleManagementScreen';

const ScheduleManagementScreen: React.FC = () => {
  const [triggers, setTriggers] = useState<ScheduledTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load scheduled triggers
   */
  const loadTriggers = useCallback(async () => {
    try {
      logger.info(TAG, 'Loading scheduled triggers');
      const storedTriggers = await PreferencesStore.getScheduledTriggers();

      // Sort by trigger time
      storedTriggers.sort(
        (a, b) =>
          new Date(a.triggerTime).getTime() - new Date(b.triggerTime).getTime(),
      );

      setTriggers(storedTriggers);

      // Sync with ScheduleService
      storedTriggers.forEach(trigger => {
        if (trigger.enabled) {
          ScheduleService.addTrigger(trigger);
        }
      });
    } catch (error) {
      logger.error(TAG, 'Error loading triggers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTriggers();
  }, [loadTriggers]);

  /**
   * Toggle trigger enabled/disabled
   */
  const toggleTrigger = async (trigger: ScheduledTrigger) => {
    try {
      const updatedTrigger = {...trigger, enabled: !trigger.enabled};

      if (updatedTrigger.enabled) {
        await ScheduleService.addTrigger(updatedTrigger);
      } else {
        await ScheduleService.removeTrigger(updatedTrigger.id);
      }

      // Update in storage
      const updatedTriggers = triggers.map(t =>
        t.id === trigger.id ? updatedTrigger : t,
      );
      setTriggers(updatedTriggers);
      await PreferencesStore.setScheduledTriggers(updatedTriggers);

      logger.info(TAG, `Trigger ${trigger.id} ${updatedTrigger.enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      logger.error(TAG, 'Error toggling trigger:', error);
    }
  };

  /**
   * Delete a trigger
   */
  const deleteTrigger = (trigger: ScheduledTrigger) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this scheduled trigger?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ScheduleService.removeTrigger(trigger.id);
              await PreferencesStore.deleteScheduledTrigger(trigger.id);

              const updatedTriggers = triggers.filter(t => t.id !== trigger.id);
              setTriggers(updatedTriggers);

              logger.info(TAG, `Trigger ${trigger.id} deleted`);
            } catch (error) {
              logger.error(TAG, 'Error deleting trigger:', error);
            }
          },
        },
      ],
    );
  };

  /**
   * Add a new sample trigger (for demo purposes)
   */
  const addSampleTrigger = async () => {
    try {
      // Create a trigger for tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const newTrigger: ScheduledTrigger = {
        id: generateId(),
        voiceNoteId: 'sample_voice_note', // In real app, this would be a real voice note ID
        triggerTime: tomorrow,
        repeat: RepeatPattern.DAILY,
        enabled: true,
        daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
      };

      await PreferencesStore.addScheduledTrigger(newTrigger);
      await ScheduleService.addTrigger(newTrigger);

      setTriggers([...triggers, newTrigger]);
      logger.info(TAG, 'Sample trigger added');
    } catch (error) {
      logger.error(TAG, 'Error adding sample trigger:', error);
    }
  };

  /**
   * Get repeat pattern display text
   */
  const getRepeatText = (trigger: ScheduledTrigger): string => {
    if (!trigger.repeat || trigger.repeat === RepeatPattern.NONE) {
      return 'Once';
    }

    switch (trigger.repeat) {
      case RepeatPattern.DAILY:
        return 'Every day';
      case RepeatPattern.WEEKLY:
        return 'Every week';
      case RepeatPattern.WEEKDAYS:
        return 'Weekdays';
      case RepeatPattern.WEEKENDS:
        return 'Weekends';
      case RepeatPattern.CUSTOM:
        if (trigger.daysOfWeek && trigger.daysOfWeek.length > 0) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return trigger.daysOfWeek.map(d => days[d]).join(', ');
        }
        return 'Custom';
      default:
        return 'Once';
    }
  };

  /**
   * Render trigger item
   */
  const renderTriggerItem = ({item}: {item: ScheduledTrigger}) => (
    <View style={styles.triggerCard}>
      <View style={styles.triggerContent}>
        <View style={styles.triggerHeader}>
          <Icon
            name="time"
            size={24}
            color={item.enabled ? COLORS.primary : COLORS.textSecondary}
          />
          <View style={styles.triggerInfo}>
            <Text style={styles.triggerTime}>{formatTime(new Date(item.triggerTime))}</Text>
            <Text style={styles.triggerDate}>
              {formatDate(new Date(item.triggerTime))}
            </Text>
          </View>

          <Switch
            value={item.enabled}
            onValueChange={() => toggleTrigger(item)}
            trackColor={{false: COLORS.divider, true: COLORS.primaryLight}}
            thumbColor={item.enabled ? COLORS.primary : COLORS.surface}
          />
        </View>

        <View style={styles.triggerDetails}>
          <View style={styles.triggerDetailRow}>
            <Icon name="repeat" size={16} color={COLORS.textSecondary} />
            <Text style={styles.triggerDetailText}>{getRepeatText(item)}</Text>
          </View>

          {item.voiceNoteId && (
            <View style={styles.triggerDetailRow}>
              <Icon name="musical-note" size={16} color={COLORS.textSecondary} />
              <Text style={styles.triggerDetailText} numberOfLines={1}>
                Voice Note ID: {item.voiceNoteId}
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTrigger(item)}>
        <Icon name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="calendar-outline" size={80} color={COLORS.divider} />
      <Text style={styles.emptyStateTitle}>No Scheduled Triggers</Text>
      <Text style={styles.emptyStateDescription}>
        Create scheduled triggers to receive voice notes at specific times.
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={addSampleTrigger}>
        <Icon name="add-circle" size={24} color={COLORS.onPrimary} />
        <Text style={styles.addButtonText}>Add Sample Trigger</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={triggers}
        renderItem={renderTriggerItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />

      {triggers.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={addSampleTrigger}>
          <Icon name="add" size={28} color={COLORS.onPrimary} />
        </TouchableOpacity>
      )}
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
    paddingBottom: 80,
  },
  triggerCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: UI_CONSTANTS.CARD_BORDER_RADIUS,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  triggerContent: {
    flex: 1,
  },
  triggerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  triggerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  triggerTime: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  triggerDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  triggerDetails: {
    gap: 8,
  },
  triggerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: UI_CONSTANTS.BUTTON_BORDER_RADIUS,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default ScheduleManagementScreen;

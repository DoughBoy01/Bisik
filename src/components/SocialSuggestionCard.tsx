/**
 * Social Suggestion Card Component
 * Displays individual social suggestion with action buttons
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {SocialSuggestion, SuggestionType} from '../types';
import {COLORS, UI_CONSTANTS} from '../constants';
import {SocialService} from '../services';
import {logger} from '../utils';

const TAG = 'SocialSuggestionCard';

interface Props {
  suggestion: SocialSuggestion;
  onAction?: () => void;
  onDismiss?: () => void;
}

const SocialSuggestionCard: React.FC<Props> = ({suggestion, onAction, onDismiss}) => {
  /**
   * Get icon name based on suggestion type
   */
  const getIconName = (): string => {
    switch (suggestion.type) {
      case SuggestionType.NEARBY_CONTACT:
        return 'location';
      case SuggestionType.SHARED_ACTIVITY:
        return 'fitness';
      case SuggestionType.MEETUP_OPPORTUNITY:
        return 'cafe';
      case SuggestionType.PLACE_RECOMMENDATION:
        return 'map';
      case SuggestionType.ACTIVITY_INVITE:
        return 'people';
      default:
        return 'person';
    }
  };

  /**
   * Get priority color
   */
  const getPriorityColor = (): string => {
    switch (suggestion.priority) {
      case 'high':
        return COLORS.error;
      case 'medium':
        return COLORS.warning;
      case 'low':
        return COLORS.info;
      default:
        return COLORS.textSecondary;
    }
  };

  /**
   * Handle send message action
   */
  const handleSendMessage = async () => {
    try {
      logger.info(TAG, `Sending message for suggestion ${suggestion.id}`);

      // In a real app, this would open messaging UI or send directly
      Alert.alert(
        'Send Message',
        `Would you like to message ${suggestion.user.name}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send',
            onPress: async () => {
              await SocialService.actionSuggestion(suggestion.id);
              logger.info(TAG, 'Message sent');
              onAction?.();

              // Here you would integrate with your messaging system
              Alert.alert('Success', `Message sent to ${suggestion.user.name}`);
            },
          },
        ],
      );
    } catch (error) {
      logger.error(TAG, 'Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  /**
   * Handle dismiss action
   */
  const handleDismiss = async () => {
    try {
      logger.info(TAG, `Dismissing suggestion ${suggestion.id}`);
      await SocialService.dismissSuggestion(suggestion.id);
      onDismiss?.();
    } catch (error) {
      logger.error(TAG, 'Error dismissing suggestion:', error);
      Alert.alert('Error', 'Failed to dismiss suggestion');
    }
  };

  /**
   * Format distance
   */
  const formatDistance = (): string => {
    const distance = suggestion.context.distance ?? 0;
    if (distance < 1000) {
      return `${Math.round(distance)}m away`;
    }
    return `${(distance / 1000).toFixed(1)}km away`;
  };

  return (
    <View style={[styles.container, {borderLeftColor: getPriorityColor()}]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name={getIconName()} size={24} color={getPriorityColor()} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{suggestion.title}</Text>
          <Text style={styles.distance}>{formatDistance()}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Icon name="close-circle" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.message}>{suggestion.message}</Text>

      {suggestion.context.specialOffer && (
        <View style={styles.offerBadge}>
          <Icon name="gift" size={16} color={COLORS.success} />
          <Text style={styles.offerText}>{suggestion.context.specialOffer}</Text>
        </View>
      )}

      {suggestion.context.timeLimit && (
        <View style={styles.timeLimitContainer}>
          <Icon name="time" size={14} color={COLORS.warning} />
          <Text style={styles.timeLimitText}>{suggestion.context.timeLimit}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryAction} onPress={handleSendMessage}>
          <Icon name="chatbubble" size={18} color={COLORS.onPrimary} />
          <Text style={styles.primaryActionText}>Send Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: UI_CONSTANTS.CARD_BORDER_RADIUS,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  distance: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dismissButton: {
    padding: 4,
  },
  message: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.successLight || '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  offerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.success,
  },
  timeLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  timeLimitText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: UI_CONSTANTS.BUTTON_BORDER_RADIUS,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
});

export default SocialSuggestionCard;

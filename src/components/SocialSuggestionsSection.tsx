/**
 * Social Suggestions Section Component
 * Displays list of active social suggestions
 */

import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SocialSuggestion} from '../types';
import {COLORS} from '../constants';
import {logger} from '../utils';
import SocialService from '../services/SocialService';
import SocialSuggestionCard from './SocialSuggestionCard';

const TAG = 'SocialSuggestionsSection';

const SocialSuggestionsSection: React.FC = () => {
  const [suggestions, setSuggestions] = useState<SocialSuggestion[]>([]);

  useEffect(() => {
    // Load initial suggestions
    loadSuggestions();

    // Subscribe to new suggestions
    const unsubscribe = SocialService.onSuggestion(suggestion => {
      logger.info(TAG, 'New suggestion received:', suggestion.title);
      loadSuggestions();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Load active suggestions
   */
  const loadSuggestions = () => {
    try {
      const activeSuggestions = SocialService.getActiveSuggestions();
      setSuggestions(activeSuggestions);
      logger.debug(TAG, `Loaded ${activeSuggestions.length} active suggestions`);
    } catch (error) {
      logger.error(TAG, 'Error loading suggestions:', error);
    }
  };

  /**
   * Handle suggestion action
   */
  const handleSuggestionAction = () => {
    // Reload suggestions to remove actioned one
    loadSuggestions();
  };

  /**
   * Handle suggestion dismiss
   */
  const handleSuggestionDismiss = () => {
    // Reload suggestions to remove dismissed one
    loadSuggestions();
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Friends</Text>
        <Text style={styles.count}>{suggestions.length}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsContainer}>
        {suggestions.map(suggestion => (
          <View key={suggestion.id} style={styles.suggestionWrapper}>
            <SocialSuggestionCard
              suggestion={suggestion}
              onAction={handleSuggestionAction}
              onDismiss={handleSuggestionDismiss}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  count: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight || 'rgba(103, 80, 164, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestionsContainer: {
    paddingHorizontal: 4,
  },
  suggestionWrapper: {
    width: 320,
    marginRight: 12,
  },
});

export default SocialSuggestionsSection;

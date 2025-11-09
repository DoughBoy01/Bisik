/**
 * App Navigator
 * Main navigation configuration
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

// Import screens
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import ScheduleManagementScreen from '../screens/ScheduleManagement/ScheduleManagementScreen';

import {RootStackParamList} from '../types';
import {COLORS} from '../constants';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

/**
 * Main tab navigator (after onboarding)
 */
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: true,
        tabBarStyle: {
          borderTopColor: COLORS.divider,
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Bisik',
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: COLORS.onPrimary,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleManagementScreen}
        options={{
          title: 'Schedule',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Root stack navigator
 */
const AppNavigator: React.FC<{isOnboardingComplete: boolean}> = ({
  isOnboardingComplete,
}) => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        {!isOnboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

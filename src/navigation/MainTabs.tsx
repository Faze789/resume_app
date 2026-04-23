import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../config/themes';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MainTabParamList } from '../types/navigation';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import JobsStack from './JobsStack';
import ResumeStack from './ResumeStack';
import ATSStack from './ATSStack';
import SettingsStack from './SettingsStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
  Dashboard: { focused: 'view-dashboard', unfocused: 'view-dashboard-outline' },
  Jobs: { focused: 'briefcase', unfocused: 'briefcase-outline' },
  ResumeBuilder: { focused: 'file-document', unfocused: 'file-document-outline' },
  ATSChecker: { focused: 'chart-bar', unfocused: 'chart-bar-stacked' },
  Settings: { focused: 'cog', unfocused: 'cog-outline' },
};

export default function MainTabs() {
  const theme = useAppTheme();
  const isDark = theme.dark;
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16) + 12;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)',
          borderTopWidth: 0,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          height: 58 + bottomPadding,
          elevation: 0,
          ...(Platform.OS === 'ios'
            ? { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 }
            : {}),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const, marginTop: -2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;

          if (focused) {
            return (
              <View style={[tabStyles.activePill, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name={iconName as any} size={22} color={theme.colors.primary} />
              </View>
            );
          }

          return <MaterialCommunityIcons name={iconName as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: true, tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="Jobs" component={JobsStack} options={{ tabBarLabel: 'Jobs' }} />
      <Tab.Screen name="ResumeBuilder" component={ResumeStack} options={{ tabBarLabel: 'Resume' }} />
      <Tab.Screen name="ATSChecker" component={ATSStack} options={{ tabBarLabel: 'ATS' }} />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  activePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, Text } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../types/navigation';

import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.primary }]}>
      <Text variant="headlineLarge" style={styles.loadingTitle}>JobMatch</Text>
      <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const needsOnboarding = isAuthenticated && profile && !profile.onboarding_complete;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthStack} />
        ) : needsOnboarding ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    color: '#fff',
    fontWeight: '800',
  },
});

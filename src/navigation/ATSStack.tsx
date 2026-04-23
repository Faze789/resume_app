import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ATSStackParamList } from '../types/navigation';
import ATSHomeScreen from '../screens/ATSChecker/ATSHomeScreen';
import ATSResultScreen from '../screens/ATSChecker/ATSResultScreen';

const Stack = createNativeStackNavigator<ATSStackParamList>();

export default function ATSStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="ATSHome" component={ATSHomeScreen} options={{ title: 'ATS Checker' }} />
      <Stack.Screen name="ATSResult" component={ATSResultScreen} options={{ title: 'Analysis' }} />
    </Stack.Navigator>
  );
}

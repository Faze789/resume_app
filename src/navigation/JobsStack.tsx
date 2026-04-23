import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton } from 'react-native-paper';
import type { JobsStackParamList } from '../types/navigation';
import JobsListScreen from '../screens/Jobs/JobsListScreen';
import JobDetailScreen from '../screens/Jobs/JobDetailScreen';
import SavedJobsScreen from '../screens/Jobs/SavedJobsScreen';

const Stack = createNativeStackNavigator<JobsStackParamList>();

export default function JobsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="JobsList"
        component={JobsListScreen}
        options={({ navigation }) => ({
          title: 'Jobs',
          headerRight: () => (
            <IconButton
              icon="bookmark-multiple-outline"
              size={24}
              onPress={() => navigation.navigate('SavedJobs')}
            />
          ),
        })}
      />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Details' }} />
      <Stack.Screen name="SavedJobs" component={SavedJobsScreen} options={{ title: 'Saved Jobs' }} />
    </Stack.Navigator>
  );
}

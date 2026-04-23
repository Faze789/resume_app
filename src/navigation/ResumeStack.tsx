import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ResumeStackParamList } from '../types/navigation';
import ResumeListScreen from '../screens/ResumeBuilder/ResumeListScreen';
import ResumeEditorScreen from '../screens/ResumeBuilder/ResumeEditorScreen';
import ResumePreviewScreen from '../screens/ResumeBuilder/ResumePreviewScreen';
import ResumeTipsScreen from '../screens/ResumeBuilder/ResumeTipsScreen';

const Stack = createNativeStackNavigator<ResumeStackParamList>();

export default function ResumeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="ResumesList" component={ResumeListScreen} options={{ title: 'Resumes' }} />
      <Stack.Screen name="ResumeEditor" component={ResumeEditorScreen} options={{ title: 'Edit Resume' }} />
      <Stack.Screen name="ResumePreview" component={ResumePreviewScreen} options={{ title: 'Preview' }} />
      <Stack.Screen name="ResumeTips" component={ResumeTipsScreen} options={{ title: 'AI Resume Tips' }} />
    </Stack.Navigator>
  );
}

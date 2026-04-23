import React from 'react';
import { AppProviders } from './src/app/providers/AppProviders';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}

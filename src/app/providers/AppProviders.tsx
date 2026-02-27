import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useThemeMode } from '../../hooks/useThemeMode';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import { JobsProvider } from '../../hooks/useJobs';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

function AuthedProviders({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  return (
    <JobsProvider profile={profile}>
      {children}
    </JobsProvider>
  );
}

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { activeTheme, isDark } = useThemeMode();
  return (
    <PaperProvider theme={activeTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ErrorBoundary>
        <AuthProvider>
          <AuthedProviders>
            {children}
          </AuthedProviders>
        </AuthProvider>
      </ErrorBoundary>
    </PaperProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp>{children}</ThemedApp>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

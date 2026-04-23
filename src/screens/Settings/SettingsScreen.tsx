import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAppTheme } from '../../config/themes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, any>;

export default function SettingsScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const { signOut, profile } = useAuth();
  const { themeMode, setThemeMode } = useThemeMode();

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all cached jobs, ATS analyses, and reset settings. Your profile and resumes will be kept. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              '@jobmatch_jobs_cache',
              '@jobmatch_saved_jobs',
              '@jobmatch_job_matches',
              '@jobmatch_ats_analyses',
              '@jobmatch_platform_health',
            ]);
            Alert.alert('Done', 'Cached data has been cleared.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Card */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text variant="titleMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                {profile?.full_name}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {profile?.email}
              </Text>
              {profile?.headline && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {profile.headline}
                </Text>
              )}
            </View>
          </View>
          <Button
            mode="contained-tonal"
            icon="account-edit-outline"
            onPress={() => navigation.navigate('ProfileEdit')}
            style={styles.editButton}
            compact
          >
            Edit Profile
          </Button>
        </Card.Content>
      </Card>

      {/* Theme Toggle */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Appearance
          </Text>
          <View style={styles.themeChips}>
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <Chip
                key={mode}
                selected={themeMode === mode}
                onPress={() => setThemeMode(mode)}
                icon={mode === 'light' ? 'white-balance-sunny' : mode === 'dark' ? 'moon-waning-crescent' : 'cellphone'}
                style={[
                  styles.themeChip,
                  themeMode === mode && { backgroundColor: theme.colors.primaryContainer },
                ]}
                textStyle={themeMode === mode ? { color: theme.colors.onPrimaryContainer } : undefined}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Data Management */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Data Management
          </Text>
          <Button
            mode="outlined"
            icon="delete-outline"
            onPress={handleClearData}
            textColor={theme.colors.error}
            style={[styles.dangerButton, { borderColor: theme.colors.errorContainer }]}
          >
            Clear Cached Data
          </Button>
        </Card.Content>
      </Card>

      {/* Sign Out */}
      <Button
        mode="contained"
        icon="logout"
        onPress={handleSignOut}
        buttonColor={theme.colors.error}
        style={styles.signOutButton}
        contentStyle={styles.signOutContent}
      >
        Sign Out
      </Button>

      <Text variant="bodySmall" style={[styles.version, { color: theme.colors.outline }]}>
        JobMatch v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, borderRadius: 12 },
  cardTitle: { fontWeight: '600', marginBottom: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1 },
  editButton: { marginTop: 14, borderRadius: 12 },
  themeChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  themeChip: { borderRadius: 12 },
  dangerButton: { borderRadius: 12 },
  signOutButton: { marginTop: 8, borderRadius: 12 },
  signOutContent: { paddingVertical: 6 },
  version: { textAlign: 'center', marginTop: 24 },
});

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Card, Button, ProgressBar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { useResume } from '../../hooks/useResume';
import { calculateProfileCompleteness } from '../../utils/validation';
import { MatchScoreRing } from '../../components/ui/MatchScoreRing';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { useAppTheme } from '../../config/themes';
import type { MainTabScreenProps } from '../../types/navigation';

export default function DashboardScreen({ navigation }: MainTabScreenProps<'Dashboard'>) {
  const theme = useAppTheme();
  const { profile } = useAuth();
  const { jobs, matches, savedJobs, refreshJobs, refreshing } = useJobs();
  const { resumes } = useResume(profile?.id);

  const completeness = profile ? calculateProfileCompleteness(profile) : 0;
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const topMatches = matches
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 5)
    .map((match) => {
      const job = jobs.find((j) => j.id === match.job_id);
      return job ? { ...job, match_score: match.match_score } : null;
    })
    .filter(Boolean);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile-Centric Header */}
      <GradientBackground style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text variant="headlineSmall" style={[styles.headerName, { color: theme.colors.onBackground }]}>
                {firstName}
              </Text>
              {profile?.headline && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1} ellipsizeMode="tail">
                  {profile.headline}
                </Text>
              )}
            </View>
            <IconButton
              icon="pencil-outline"
              size={22}
              iconColor={theme.colors.onSurfaceVariant}
              onPress={() => (navigation as any).navigate('Settings', { screen: 'ProfileEdit' })}
            />
          </View>

          {/* Profile Completeness */}
          <View style={styles.completenessRow}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Profile</Text>
            <ProgressBar
              progress={completeness / 100}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {completeness}%
            </Text>
          </View>
        </View>
      </GradientBackground>

      {/* Quick Stats - Card Grid */}
      <View style={styles.statsGrid}>
        {[
          { icon: 'briefcase', value: jobs.length, label: 'Jobs Found', color: theme.colors.primary },
          { icon: 'file-document', value: resumes.length, label: 'Resumes', color: theme.colors.secondary },
          { icon: 'star', value: profile?.skills?.length || 0, label: 'Skills', color: theme.colors.warning },
          { icon: 'bookmark', value: savedJobs.length, label: 'Saved', color: theme.colors.tertiary },
        ].map((stat) => (
          <GlassCard key={stat.label} style={styles.statCard} borderRadius={12}>
            <View style={styles.statContent}>
              <MaterialCommunityIcons name={stat.icon as any} size={22} color={stat.color} />
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.onSurface }]}>
                {stat.value}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.textSecondary }} numberOfLines={1}>
                {stat.label}
              </Text>
            </View>
          </GlassCard>
        ))}
      </View>

      {/* Quick Actions */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsRow}>
            <Button
              mode="contained-tonal"
              icon="magnify"
              onPress={() => {
                refreshJobs();
                (navigation as any).navigate('Jobs', { screen: 'JobsList' });
              }}
              loading={refreshing}
              compact
              style={styles.actionButton}
            >
              Find Jobs
            </Button>
            <Button
              mode="contained-tonal"
              icon="file-plus"
              onPress={() => (navigation as any).navigate('ResumeBuilder')}
              compact
              style={styles.actionButton}
            >
              Build Resume
            </Button>
            <Button
              mode="contained-tonal"
              icon="chart-bar"
              onPress={() => (navigation as any).navigate('ATSChecker')}
              compact
              style={styles.actionButton}
            >
              ATS Check
            </Button>
            <Button
              mode="contained-tonal"
              icon="lightbulb-on"
              onPress={() => (navigation as any).navigate('ResumeBuilder', { screen: 'ResumeTips' })}
              compact
              style={styles.actionButton}
            >
              AI Tips
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Top Matches */}
      {topMatches.length > 0 && (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.matchHeader}>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Top Job Matches
              </Text>
              <Button compact onPress={() => (navigation as any).navigate('Jobs', { screen: 'JobsList' })}>See All</Button>
            </View>
            {topMatches.map((job: any) => (
              <Pressable
                key={job.id}
                style={({ pressed }) => [
                  styles.matchItem,
                  { borderBottomColor: theme.colors.outlineVariant },
                  pressed && { opacity: 0.7, backgroundColor: theme.colors.surfaceVariant },
                ]}
                onPress={() => (navigation as any).navigate('Jobs', {
                  screen: 'JobDetail',
                  params: { jobId: job.id },
                })}
              >
                <View style={{ flex: 1, flexShrink: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '500', color: theme.colors.onSurface }} numberOfLines={1} ellipsizeMode="tail">
                    {job.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1} ellipsizeMode="tail">
                    {job.company_name}
                  </Text>
                </View>
                <MatchScoreRing score={job.match_score} size={40} strokeWidth={3} />
              </Pressable>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* No Jobs Yet */}
      {jobs.length === 0 && (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.emptyCard}>
            <MaterialCommunityIcons name="briefcase-search" size={48} color={theme.colors.textMuted} />
            <Text variant="titleMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginTop: 12 }}>
              No Jobs Yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
              Tap "Find Jobs" to search for positions matching your skills
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                refreshJobs();
                (navigation as any).navigate('Jobs', { screen: 'JobsList' });
              }}
              loading={refreshing}
              style={styles.emptyButton}
            >
              Search Jobs Now
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },

  headerGradient: { flex: 0, paddingTop: 8, paddingBottom: 24, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: {},
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  headerInfo: { flex: 1 },
  headerName: { fontWeight: '700' },
  completenessRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 6, borderRadius: 3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginTop: 20, marginBottom: 16 },
  statCard: { flexBasis: '47%', flexGrow: 1 },
  statContent: { alignItems: 'center', paddingVertical: 12 },
  statNumber: { fontWeight: '700', marginTop: 2 },

  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  cardTitle: { fontWeight: '600', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionButton: { flex: 1, minWidth: 100, borderRadius: 12 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderRadius: 8 },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyButton: { borderRadius: 12 },
});

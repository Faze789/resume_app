import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, Pressable } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { MatchScoreRing } from '../../components/ui/MatchScoreRing';
import { CoverLetterModal } from '../../components/ai/CoverLetterModal';
import { JobDetailSkeleton } from '../../components/ui/SkeletonLoader';
import { useJobs } from '../../hooks/useJobs';
import { formatDate } from '../../utils/date';
import { JOB_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS } from '../../config/constants';
import { useAppTheme } from '../../config/themes';
import type { JobsScreenProps } from '../../types/navigation';

export default function JobDetailScreen({ route }: JobsScreenProps<'JobDetail'>) {
  const theme = useAppTheme();
  const { jobs, loading, isJobSaved, saveJob, unsaveJob, getMatchForJob } = useJobs();
  const [coverLetterVisible, setCoverLetterVisible] = useState(false);

  const job = jobs.find((j) => j.id === route.params.jobId);
  const match = job ? getMatchForJob(job.id) : undefined;

  if (loading && !job) {
    return <JobDetailSkeleton />;
  }

  if (!job) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: 8 }}>
          Job not found
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          This job may no longer be available.
        </Text>
      </View>
    );
  }

  const saved = isJobSaved(job.id);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saved ? unsaveJob(job.id) : saveJob(job);
  };

  const handleCoverLetter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCoverLetterVisible(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <Card style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={3} ellipsizeMode="tail">
                {job.title}
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }} numberOfLines={1} ellipsizeMode="tail">
                {job.company_name}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.textMuted, marginBottom: 12 }} numberOfLines={1} ellipsizeMode="tail">
                {job.is_remote ? 'Remote' : job.location || 'Location not specified'}
              </Text>
            </View>
            {match && <MatchScoreRing score={match.match_score} size={72} strokeWidth={6} />}
          </View>

          <View style={styles.chips}>
            <Chip compact style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]}>
              {JOB_TYPE_LABELS[job.job_type] || job.job_type}
            </Chip>
            <Chip compact style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]}>
              {EXPERIENCE_LEVEL_LABELS[job.experience_level] || job.experience_level}
            </Chip>
            {job.salary_min && (
              <Chip compact style={[styles.chip, { backgroundColor: theme.colors.tertiaryContainer }]}>
                ${Math.round(job.salary_min / 1000)}k{job.salary_max ? `-${Math.round(job.salary_max / 1000)}k` : '+'}
              </Chip>
            )}
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.textMuted }}>
            Posted {formatDate(job.posted_at)} via {job.source_platform}
          </Text>
        </Card.Content>
      </Card>

      {/* Match Details */}
      {match && match.match_reasons.length > 0 && (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Match Analysis
            </Text>
            {match.match_reasons.map((reason, i) => (
              <Text key={i} variant="bodyMedium" style={{ color: theme.colors.tertiary, marginBottom: 4 }}>
                {'\u2713'} {reason}
              </Text>
            ))}
            {match.matched_skills.length > 0 && (
              <View style={styles.matchSkills}>
                <Text variant="titleSmall" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: 8 }}>
                  Matching Skills
                </Text>
                <View style={styles.skillChips}>
                  {match.matched_skills.map((skill) => (
                    <Chip key={skill} compact style={[styles.skillChip, { backgroundColor: theme.colors.primaryContainer }]}>
                      {skill}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Required Skills */}
      {job.skills_required.length > 0 && (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Required Skills
            </Text>
            <View style={styles.skillChips}>
              {job.skills_required.map((skill) => {
                const isMatched = match?.matched_skills.includes(skill);
                return (
                  <Chip
                    key={skill}
                    compact
                    style={[
                      styles.skillChip,
                      isMatched
                        ? { backgroundColor: theme.colors.tertiaryContainer }
                        : { backgroundColor: theme.colors.errorContainer },
                    ]}
                    textStyle={{
                      fontSize: 11,
                      color: isMatched ? theme.colors.tertiary : theme.colors.error,
                    }}
                  >
                    {skill}
                  </Chip>
                );
              })}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Description */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Job Description
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
            {job.description.slice(0, 3000)}
            {job.description.length > 3000 ? '...' : ''}
          </Text>
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.actionPressable,
            { backgroundColor: saved ? theme.colors.primaryContainer : theme.colors.surfaceVariant },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={{ color: saved ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: 14 }}>
            {saved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleCoverLetter}
          style={({ pressed }) => [
            styles.actionPressable,
            { backgroundColor: theme.colors.secondaryContainer },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={{ color: theme.colors.secondary, fontWeight: '600', fontSize: 14 }}>
            Cover Letter
          </Text>
        </Pressable>
        {job.source_url && (
          <Pressable
            onPress={() => Linking.openURL(job.source_url!).catch(() => Alert.alert('Error', 'Could not open the application link.'))}
            style={({ pressed }) => [
              styles.actionPressable,
              { backgroundColor: theme.colors.primary, flex: 1.5 },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '700', fontSize: 14 }}>
              Apply
            </Text>
          </Pressable>
        )}
      </View>

      <CoverLetterModal
        visible={coverLetterVisible}
        onDismiss={() => setCoverLetterVisible(false)}
        job={job}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: { borderRadius: 16, marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontWeight: '700', marginBottom: 4 },
  chips: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  chip: {},
  card: { borderRadius: 16, marginBottom: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  matchSkills: { marginTop: 12 },
  skillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: {},
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  actionPressable: { flex: 1, minWidth: 90, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});

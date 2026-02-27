import React, { useCallback } from 'react';
import { View, StyleSheet, Image, Animated, Platform, Pressable } from 'react-native';
import { Text, Chip, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MatchScoreRing } from '../ui/MatchScoreRing';
import { formatRelativeTime } from '../../utils/date';
import { JOB_TYPE_LABELS } from '../../config/constants';
import { LOCALITY_LABELS, LOCALITY_COLORS } from '../../services/jobs/matchScoring';
import { useSlideUp, useScale } from '../../hooks/useAnimations';
import { useAppTheme } from '../../config/themes';
import type { JobListing, JobMatch } from '../../types/models';

type Props = {
  job: JobListing;
  match?: JobMatch;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
};

export function JobCard({ job, match, isSaved, onPress, onSave }: Props) {
  const theme = useAppTheme();
  const locality = match?.locality || 'unknown';
  const localityLabel = LOCALITY_LABELS[locality];
  const localityColor = LOCALITY_COLORS[locality];
  const isHighMatch = match && match.match_score >= 70;

  const { opacity, translateY } = useSlideUp(0, 10, 300);
  const scale = useScale(0, 0.97, 200);

  const hasSalary = job.salary_min != null || job.salary_max != null;
  const salaryText = hasSalary
    ? `$${job.salary_min ? Math.round(job.salary_min / 1000) : '?'}k${job.salary_max ? `\u2013$${Math.round(job.salary_max / 1000)}k` : '+'}`
    : null;

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave();
  }, [onSave]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.colors.surface },
          Platform.OS === 'ios'
            ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }
            : { elevation: 2 },
          pressed && styles.pressed,
        ]}
      >
        {/* Gradient accent for high-match jobs */}
        {isHighMatch && (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentStrip}
          />
        )}

        <View style={styles.content}>
          {/* Row 1: Logo + Title/Company + Score */}
          <View style={styles.topRow}>
            {job.company_logo_url ? (
              <Image source={{ uri: job.company_logo_url }} style={[styles.logo, { backgroundColor: theme.colors.surfaceVariant }]} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                  {job.company_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.titleBlock}>
              <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={2} ellipsizeMode="tail">
                {job.title}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }} numberOfLines={1} ellipsizeMode="tail">
                {job.company_name}
              </Text>
            </View>

            <View style={styles.scoreCol}>
              {match && <MatchScoreRing score={match.match_score} size={46} strokeWidth={4} />}
            </View>
          </View>

          {/* Row 2: Location + Time + Locality Badge */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              {job.location && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">
                    {job.is_remote && job.location ? `${job.location} (Remote)` : job.is_remote ? 'Remote' : job.location}
                  </Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.textMuted} />
                <Text variant="bodySmall" style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {formatRelativeTime(job.posted_at)}
                </Text>
              </View>
            </View>

            {localityLabel ? (
              <View style={[styles.localityBadge, { backgroundColor: localityColor.bg }]}>
                <Text style={[styles.localityText, { color: localityColor.text }]}>
                  {localityLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Row 3: Chips */}
          <View style={styles.chipRow}>
            <Chip compact style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={styles.chipText}>
              {JOB_TYPE_LABELS[job.job_type] || job.job_type}
            </Chip>
            {salaryText && (
              <Chip compact icon="currency-usd" style={[styles.chip, { backgroundColor: theme.colors.tertiaryContainer }]} textStyle={styles.chipText}>
                {salaryText}
              </Chip>
            )}
            {job.experience_level && job.experience_level !== 'mid' && (
              <Chip compact style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={styles.chipText}>
                {job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)}
              </Chip>
            )}
          </View>

          {/* Row 4: Matched Skills */}
          {match && match.matched_skills.length > 0 && (
            <View style={styles.skillsRow}>
              {match.matched_skills.slice(0, 5).map((skill) => (
                <Chip
                  key={skill}
                  compact
                  style={[styles.skillChip, { backgroundColor: theme.colors.primaryContainer }]}
                  textStyle={{ fontSize: 10, color: theme.colors.onPrimaryContainer }}
                >
                  {skill}
                </Chip>
              ))}
              {match.matched_skills.length > 5 && (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, alignSelf: 'center', marginLeft: 2, fontSize: 11 }}>
                  +{match.matched_skills.length - 5}
                </Text>
              )}
            </View>
          )}

          {/* Row 5: Source + Bookmark */}
          <View style={styles.bottomRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.textMuted, fontSize: 11 }}>
              via {job.source_platform}
            </Text>
            <IconButton
              icon={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              iconColor={isSaved ? theme.colors.primary : theme.colors.textMuted}
              onPress={handleSave}
              style={styles.bookmarkBtn}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  accentStrip: { height: 3 },
  content: { paddingVertical: 14, paddingHorizontal: 16 },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  logo: { width: 42, height: 42, borderRadius: 12 },
  logoPlaceholder: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1, flexShrink: 1 },
  title: { fontWeight: '700', fontSize: 15, lineHeight: 20, marginBottom: 2 },
  scoreCol: { alignItems: 'center', marginLeft: 4 },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, flexShrink: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  localityBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  localityText: { fontSize: 11, fontWeight: '700' },

  chipRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  chip: { flexShrink: 1 },
  chipText: { fontSize: 11 },

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  skillChip: {},

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  bookmarkBtn: { margin: 0, marginRight: -8 },
});

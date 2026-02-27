import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip, Divider } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { MatchScoreRing } from '../../components/ui/MatchScoreRing';
import { useATS } from '../../hooks/useATS';
import type { ATSScreenProps } from '../../types/navigation';
import type { ATSSuggestion } from '../../types/models';

const CATEGORY_LABELS: Record<string, string> = {
  keyword_score: 'Keywords',
  skills_score: 'Skills',
  experience_score: 'Experience',
  education_score: 'Education',
  formatting_score: 'Formatting',
};

function ScoreBreakdown({ label, score, theme }: { label: string; score: number; theme: any }) {
  const color = score >= 80 ? theme.colors.success : score >= 60 ? theme.colors.warning : theme.colors.error;
  return (
    <View style={bStyles.row}>
      <Text variant="bodyMedium" style={[bStyles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={[bStyles.barContainer, { backgroundColor: theme.colors.outlineVariant }]}>
        <View style={[bStyles.bar, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <Text variant="labelMedium" style={[bStyles.score, { color }]}>{score}%</Text>
    </View>
  );
}

const bStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  label: { width: 90 },
  barContainer: { flex: 1, height: 8, borderRadius: 4, marginHorizontal: 8 },
  bar: { height: 8, borderRadius: 4 },
  score: { width: 40, textAlign: 'right', fontWeight: '600' },
});

function SuggestionItem({ suggestion, theme }: { suggestion: ATSSuggestion; theme: any }) {
  const PRIORITY_COLORS: Record<string, string> = {
    critical: theme.colors.error,
    high: '#EA580C',
    medium: theme.colors.warning,
    low: theme.colors.success,
  };
  const color = PRIORITY_COLORS[suggestion.priority] || theme.colors.textSecondary;
  return (
    <View style={[sStyles.container, { borderBottomColor: theme.colors.background }]}>
      <View style={sStyles.header}>
        <Chip compact style={[sStyles.priority, { backgroundColor: color + '20' }]} textStyle={{ color, fontSize: 10 }}>
          {suggestion.priority.toUpperCase()}
        </Chip>
        <Chip compact style={[sStyles.category, { backgroundColor: theme.colors.background }]} textStyle={{ fontSize: 10 }}>
          {suggestion.category}
        </Chip>
        {suggestion.source && (
          <Chip compact style={[sStyles.source, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={{ fontSize: 9, color: theme.colors.textSecondary }}>
            {suggestion.source}
          </Chip>
        )}
      </View>
      <Text variant="bodyMedium" style={[sStyles.message, { color: theme.colors.onSurfaceVariant }]}>{suggestion.message}</Text>
      {suggestion.currentText && (
        <View style={[sStyles.textBox, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodySmall" style={[sStyles.textLabel, { color: theme.colors.textSecondary }]}>Current:</Text>
          <Text variant="bodySmall" style={[sStyles.currentText, { color: theme.colors.error }]}>{suggestion.currentText}</Text>
        </View>
      )}
      {suggestion.suggestedText && (
        <View style={[sStyles.textBox, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodySmall" style={[sStyles.textLabel, { color: theme.colors.textSecondary }]}>Suggested:</Text>
          <Text variant="bodySmall" style={[sStyles.suggestedText, { color: theme.colors.success }]}>{suggestion.suggestedText}</Text>
        </View>
      )}
    </View>
  );
}

const sStyles = StyleSheet.create({
  container: { paddingVertical: 12, borderBottomWidth: 1 },
  header: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  priority: { height: 22 },
  category: { height: 22 },
  source: { height: 22 },
  message: { lineHeight: 20 },
  textBox: { marginTop: 6, padding: 8, borderRadius: 6 },
  textLabel: { fontWeight: '600', marginBottom: 2 },
  currentText: {},
  suggestedText: {},
});

export default function ATSResultScreen({ route }: ATSScreenProps<'ATSResult'>) {
  const theme = useAppTheme();
  const { currentAnalysis, getAnalysis } = useATS();

  useEffect(() => {
    getAnalysis(route.params.analysisId);
  }, [route.params.analysisId]);

  if (!currentAnalysis) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge">Loading analysis...</Text>
      </View>
    );
  }

  const analysis = currentAnalysis;
  const sortedSuggestions = [...analysis.suggestions].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] || 3) - (order[b.priority] || 3);
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      {/* Overall Score */}
      <Card style={styles.card}>
        <Card.Content style={styles.scoreCenter}>
          <MatchScoreRing score={analysis.overall_score} size={100} strokeWidth={8} />
          <Text variant="headlineSmall" style={styles.overallLabel}>ATS Score</Text>
          {analysis.job_title && (
            <Text variant="bodyMedium" style={[styles.jobTitle, { color: theme.colors.textSecondary }]}>for "{analysis.job_title}"</Text>
          )}
        </Card.Content>
      </Card>

      {/* Score Breakdown */}
      <Card style={styles.card}>
        <Card.Title title="Score Breakdown" />
        <Card.Content>
          <ScoreBreakdown label="Keywords" score={analysis.keyword_score} theme={theme} />
          <ScoreBreakdown label="Skills" score={analysis.skills_score} theme={theme} />
          <ScoreBreakdown label="Experience" score={analysis.experience_score} theme={theme} />
          <ScoreBreakdown label="Education" score={analysis.education_score} theme={theme} />
          <ScoreBreakdown label="Formatting" score={analysis.formatting_score} theme={theme} />
        </Card.Content>
      </Card>

      {/* Matched Keywords */}
      {analysis.matched_keywords.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title={`Matched Keywords (${analysis.matched_keywords.length})`} />
          <Card.Content>
            <View style={styles.chips}>
              {analysis.matched_keywords.slice(0, 20).map((kw) => (
                <Chip key={kw} compact style={[styles.chip, { backgroundColor: theme.colors.successContainer }]} textStyle={{ color: theme.colors.onSuccess, fontSize: 11 }}>
                  {kw}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Missing Keywords */}
      {analysis.missing_keywords.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title={`Missing Keywords (${analysis.missing_keywords.length})`} />
          <Card.Content>
            <View style={styles.chips}>
              {analysis.missing_keywords.map((kw) => (
                <Chip key={kw} compact style={[styles.chip, { backgroundColor: theme.colors.errorContainer }]} textStyle={{ color: theme.colors.error, fontSize: 11 }}>
                  {kw}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Skill Gaps */}
      {analysis.skill_gaps.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title={`Skill Gaps (${analysis.skill_gaps.length})`} />
          <Card.Content>
            <View style={styles.chips}>
              {analysis.skill_gaps.map((skill) => (
                <Chip key={skill} compact style={[styles.chip, { backgroundColor: theme.colors.warningContainer }]} textStyle={{ color: theme.colors.onWarning, fontSize: 11 }}>
                  {skill}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Suggestions */}
      {sortedSuggestions.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title={`Suggestions (${sortedSuggestions.length})`} />
          <Card.Content>
            {sortedSuggestions.map((s, i) => (
              <SuggestionItem key={i} suggestion={s} theme={theme} />
            ))}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12 },
  scoreCenter: { alignItems: 'center', paddingVertical: 20 },
  overallLabel: { fontWeight: '700', marginTop: 12 },
  jobTitle: { marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 26 },
});

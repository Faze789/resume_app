import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Chip, Card, ProgressBar } from 'react-native-paper';
import { useAppTheme } from '../../../config/themes';
import type { UserProfile, ConfidenceScores } from '../../../types/models';

type Props = {
  formData: Partial<UserProfile>;
  onUpdate: (updates: Partial<UserProfile>) => void;
  onConfirm: () => void;
  saving: boolean;
  confidence: ConfidenceScores | null;
};

function ConfidenceBadge({ label, score }: { label: string; score: number }) {
  const theme = useAppTheme();
  const color = score >= 0.8 ? theme.colors.success : score >= 0.5 ? theme.colors.warning : theme.colors.error;
  const bg = score >= 0.8 ? theme.colors.successContainer : score >= 0.5 ? theme.colors.warningContainer : theme.colors.errorContainer;
  return (
    <View style={[confidenceStyles.badge, { backgroundColor: bg }]}>
      <Text style={[confidenceStyles.label, { color }]}>{label}: {Math.round(score * 100)}%</Text>
    </View>
  );
}

const confidenceStyles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '600' },
});

export function ParsedDataReviewStep({ formData, onUpdate, onConfirm, saving, confidence }: Props) {
  const theme = useAppTheme();
  const overallScore = confidence
    ? Object.values(confidence).reduce((sum, c) => sum + c.score, 0) / Math.max(Object.keys(confidence).length, 1)
    : null;

  const experienceVal = parseInt(String(formData.experience_years || ''), 10);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Review Your Information</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        Please verify the data we extracted from your resume
      </Text>

      {/* Confidence Summary */}
      {confidence && overallScore != null && (
        <Card style={[styles.card, { backgroundColor: overallScore >= 0.7 ? theme.colors.successContainer : theme.colors.warningContainer }]}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>Extraction Confidence</Text>
            <ProgressBar
              progress={overallScore}
              color={overallScore >= 0.8 ? theme.colors.success : overallScore >= 0.5 ? theme.colors.warning : theme.colors.error}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
              Overall: {Math.round(overallScore * 100)}% confident
            </Text>
            <View style={styles.confidenceBadges}>
              {Object.entries(confidence).map(([field, data]) => (
                <ConfidenceBadge key={field} label={field} score={data.score} />
              ))}
            </View>
            {overallScore < 0.7 && (
              <Text variant="bodySmall" style={{ color: theme.colors.warning, marginTop: 8, fontStyle: 'italic' }}>
                Some fields may need manual correction. Please review carefully.
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Full Name *"
            value={formData.full_name || ''}
            onChangeText={(v) => onUpdate({ full_name: v })}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          {!formData.full_name?.trim() && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8, marginTop: -4 }}>Full name is required</Text>
          )}
          <TextInput
            label="Headline"
            value={formData.headline || ''}
            onChangeText={(v) => onUpdate({ headline: v })}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="Location"
            value={formData.location || ''}
            onChangeText={(v) => onUpdate({ location: v })}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="Phone"
            value={formData.phone || ''}
            onChangeText={(v) => onUpdate({ phone: v })}
            mode="outlined"
            keyboardType="phone-pad"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="Years of Experience"
            value={String(formData.experience_years || '')}
            onChangeText={(v) => {
              const num = parseInt(v, 10);
              onUpdate({ experience_years: isNaN(num) ? 0 : Math.min(Math.max(num, 0), 50) });
            }}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          {experienceVal > 50 && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8, marginTop: -4 }}>Experience years cannot exceed 50</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>Skills</Text>
          <View style={styles.chips}>
            {(formData.skills || []).map((skill) => (
              <Chip
                key={skill}
                onClose={() => onUpdate({ skills: (formData.skills || []).filter((s) => s !== skill) })}
                style={styles.chip}
              >
                {skill}
              </Chip>
            ))}
          </View>
          {(formData.skills || []).length === 0 && (
            <Text variant="bodySmall" style={{ color: theme.colors.textMuted }}>No skills detected - you can add them in the next step</Text>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={onConfirm}
        loading={saving}
        disabled={saving || !formData.full_name?.trim()}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Looks Good - Continue
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 8 },
  card: { marginBottom: 16, borderRadius: 12 },
  input: { marginBottom: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  button: { marginTop: 16, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 8 },
  confidenceBadges: { flexDirection: 'row', flexWrap: 'wrap' },
});

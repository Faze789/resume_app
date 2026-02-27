import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Card, Button, Chip, Divider } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useResume } from '../../hooks/useResume';
import { settingsStorage } from '../../services/storage/settings.storage';
import { callGemini } from '../../services/ai/gemini.service';
import type { ResumeScreenProps } from '../../types/navigation';
import type { Resume } from '../../types/models';

type ResumeTip = {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
};

type TipsResult = {
  overall_score: number;
  strengths: string[];
  tips: ResumeTip[];
};

const CATEGORY_ICONS: Record<string, string> = {
  content: 'file-document-edit',
  formatting: 'format-align-left',
  skills: 'star',
  experience: 'briefcase',
  keywords: 'key',
  impact: 'trending-up',
  ats: 'magnify-scan',
  general: 'lightbulb',
};

function buildResumeText(resume: Resume): string {
  const parts: string[] = [];

  if (resume.content.personal_info.full_name) {
    parts.push(`Name: ${resume.content.personal_info.full_name}`);
  }
  if (resume.content.summary) {
    parts.push(`Summary: ${resume.content.summary}`);
  }

  for (const section of resume.content.sections) {
    parts.push(`\n--- ${section.title} ---`);
    for (const item of section.items) {
      if ('title' in item && 'organization' in item) {
        const entry = item as any;
        parts.push(`${entry.title} at ${entry.organization}`);
        if (entry.bullets?.length) {
          for (const b of entry.bullets) parts.push(`  - ${b}`);
        }
        if (entry.description) parts.push(`  ${entry.description}`);
      } else if ('category' in item && 'skills' in item) {
        const skill = item as any;
        parts.push(`${skill.category}: ${skill.skills.join(', ')}`);
      }
    }
  }

  return parts.join('\n');
}

export default function ResumeTipsScreen({ navigation }: ResumeScreenProps<'ResumeTips'>) {
  const theme = useAppTheme();
  const { profile } = useAuth();
  const { resumes } = useResume(profile?.id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TipsResult | null>(null);
  const [error, setError] = useState('');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

  const PRIORITY_COLORS: Record<string, string> = {
    critical: theme.colors.error,
    high: '#EA580C',
    medium: theme.colors.warning,
    low: theme.colors.success,
  };

  const primaryResume = resumes.find((r) => r.is_primary) || resumes[0] || null;

  useEffect(() => {
    if (primaryResume && !selectedResume) {
      setSelectedResume(primaryResume);
    }
  }, [primaryResume]);

  const analyzeTips = async () => {
    if (!selectedResume) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const settings = await settingsStorage.get();
      const geminiKey = settings.gemini_api_key;
      if (!geminiKey) {
        setError('Gemini API key not configured. Go to Settings to add it.');
        setLoading(false);
        return;
      }

      const resumeText = buildResumeText(selectedResume);
      const skillsList = profile?.skills?.join(', ') || '';
      const headline = profile?.headline || '';

      const prompt = `You are an expert career coach and resume reviewer. Analyze this resume and provide actionable improvement tips.

The person's profile: ${headline}, Skills: ${skillsList}

Resume content:
${resumeText}

Return a JSON object with this exact structure:
{
  "overall_score": <number 0-100 representing resume quality>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "tips": [
    {
      "category": "content|formatting|skills|experience|keywords|impact|ats|general",
      "priority": "critical|high|medium|low",
      "title": "Short tip title (5-8 words)",
      "description": "Detailed explanation of what to improve and why (2-3 sentences)",
      "action": "Specific action the user should take (1 sentence)"
    }
  ]
}

Provide 6-10 tips sorted by priority (critical first). Focus on:
1. Missing quantified achievements (numbers, %, $)
2. Weak action verbs that should be stronger
3. Missing keywords for their field
4. ATS optimization suggestions
5. Skills gaps or skills that should be highlighted more
6. Summary/objective quality
7. Overall structure and completeness
8. Tailoring advice for their target role

Be specific — reference actual content from their resume when possible.`;

      const response = await callGemini(geminiKey, [
        { role: 'user', parts: [{ text: prompt }] }
      ], {
        temperature: 0.3,
        maxOutputTokens: 4096,
        timeoutMs: 30000,
        jsonMode: true,
      });

      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="lightbulb-on" size={40} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={styles.title}>AI Resume Tips</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Get personalized tips to improve your resume and land more interviews
        </Text>
      </View>

      {/* Resume selector */}
      {resumes.length > 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>Selected Resume</Text>
            <View style={styles.resumeChips}>
              {resumes.map((r) => (
                <Chip
                  key={r.id}
                  selected={selectedResume?.id === r.id}
                  onPress={() => { setSelectedResume(r); setResult(null); }}
                  style={[
                    styles.resumeChip,
                    selectedResume?.id === r.id && { backgroundColor: theme.colors.primaryContainer },
                  ]}
                  compact
                >
                  {r.title}{r.is_primary ? ' (Primary)' : ''}
                </Chip>
              ))}
            </View>
            <Button
              mode="contained"
              onPress={analyzeTips}
              loading={loading}
              disabled={loading || !selectedResume}
              icon="auto-fix"
              style={styles.analyzeButton}
            >
              {loading ? 'Analyzing...' : 'Get AI Tips'}
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content style={styles.emptyCard}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color={theme.colors.textMuted} />
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Create a resume first to get personalized tips
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('ResumeEditor', {})}
              style={styles.createButton}
            >
              Create Resume
            </Button>
          </Card.Content>
        </Card>
      )}

      {error ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.error }}>{error}</Text>
          </Card.Content>
        </Card>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Analyzing your resume with AI...
          </Text>
        </View>
      ) : null}

      {/* Results */}
      {result && (
        <>
          {/* Score Card */}
          <Card style={styles.card}>
            <Card.Content style={styles.scoreCard}>
              <View style={[styles.scoreRing, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="headlineLarge" style={[styles.scoreNumber, { color: theme.colors.primary }]}>
                  {result.overall_score}
                </Text>
                <Text variant="bodySmall" style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>/ 100</Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text variant="titleMedium" style={styles.scoreTitle}>Resume Score</Text>
                <Text variant="bodySmall" style={[styles.scoreDesc, { color: theme.colors.textSecondary }]}>
                  {result.overall_score >= 80 ? 'Excellent resume!' :
                   result.overall_score >= 60 ? 'Good, with room to improve' :
                   result.overall_score >= 40 ? 'Needs some work' :
                   'Significant improvements needed'}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall" style={styles.cardTitle}>Strengths</Text>
                {result.strengths.map((s, i) => (
                  <View key={i} style={styles.strengthItem}>
                    <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.success} />
                    <Text variant="bodyMedium" style={styles.strengthText}>{s}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Tips */}
          <Text variant="titleMedium" style={styles.tipsHeader}>
            Improvement Tips ({result.tips.length})
          </Text>

          {result.tips.map((tip, i) => (
            <Card key={i} style={styles.tipCard}>
              <Card.Content>
                <View style={styles.tipHeader}>
                  <MaterialCommunityIcons
                    name={(CATEGORY_ICONS[tip.category] || 'lightbulb') as any}
                    size={22}
                    color={PRIORITY_COLORS[tip.priority] || theme.colors.textSecondary}
                  />
                  <View style={styles.tipTitleRow}>
                    <Text variant="titleSmall" style={styles.tipTitle}>{tip.title}</Text>
                    <Chip
                      compact
                      style={[styles.priorityChip, { backgroundColor: `${PRIORITY_COLORS[tip.priority]}15` }]}
                      textStyle={[styles.priorityText, { color: PRIORITY_COLORS[tip.priority] }]}
                    >
                      {tip.priority}
                    </Chip>
                  </View>
                </View>
                <Text variant="bodyMedium" style={[styles.tipDescription, { color: theme.colors.onSurfaceVariant }]}>{tip.description}</Text>
                <Divider style={styles.tipDivider} />
                <View style={styles.actionRow}>
                  <MaterialCommunityIcons name="arrow-right-circle" size={16} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={[styles.actionText, { color: theme.colors.primary }]}>
                    {tip.action}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontWeight: '700', marginTop: 8 },
  subtitle: { textAlign: 'center', marginTop: 4 },
  card: { marginBottom: 12, borderRadius: 12 },
  cardTitle: { fontWeight: '600', marginBottom: 10 },
  resumeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  resumeChip: { height: 34 },
  analyzeButton: { borderRadius: 12 },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { textAlign: 'center', marginTop: 12, marginBottom: 16 },
  createButton: { borderRadius: 12 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 16 },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreRing: { alignItems: 'center', width: 80, height: 80, justifyContent: 'center', borderRadius: 40 },
  scoreNumber: { fontWeight: '800', fontSize: 28 },
  scoreLabel: { marginTop: -4 },
  scoreInfo: { flex: 1 },
  scoreTitle: { fontWeight: '600' },
  scoreDesc: { marginTop: 4 },
  strengthItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  strengthText: { flex: 1 },
  tipsHeader: { fontWeight: '700', marginTop: 8, marginBottom: 12 },
  tipCard: { marginBottom: 10, borderRadius: 12 },
  tipHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  tipTitle: { fontWeight: '600', flex: 1 },
  priorityChip: { height: 24 },
  priorityText: { fontSize: 11, fontWeight: '600' },
  tipDescription: { lineHeight: 20, marginBottom: 8 },
  tipDivider: { marginBottom: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  actionText: { flex: 1, fontWeight: '500' },
});

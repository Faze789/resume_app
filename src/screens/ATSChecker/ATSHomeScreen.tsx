import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, TextInput, RadioButton, ActivityIndicator } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { useAuth } from '../../hooks/useAuth';
import { useResume } from '../../hooks/useResume';
import { useATS } from '../../hooks/useATS';
import type { ATSScreenProps } from '../../types/navigation';
import type { Resume } from '../../types/models';

export default function ATSHomeScreen({ navigation, route }: ATSScreenProps<'ATSHome'>) {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { resumes } = useResume(user?.id);
  const { analyze, loading } = useATS();

  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const primary = resumes.find((r) => r.is_primary) || resumes[0];
      setSelectedResumeId(primary.id);
    }
  }, [resumes, selectedResumeId]);

  const getResumeText = (resume: Resume): string => {
    if (resume.raw_text) return resume.raw_text;

    // Build text from content
    const parts: string[] = [];
    const { content } = resume;
    parts.push(content.personal_info.full_name);
    if (content.summary) parts.push(content.summary);

    for (const section of content.sections) {
      parts.push(section.title);
      for (const item of section.items) {
        const anyItem = item as any;
        if (anyItem.title) parts.push(anyItem.title);
        if (anyItem.organization) parts.push(anyItem.organization);
        if (anyItem.description) parts.push(anyItem.description);
        if (anyItem.bullets) parts.push(...anyItem.bullets);
        if (anyItem.skills) parts.push(...anyItem.skills);
        if (anyItem.category) parts.push(anyItem.category);
      }
    }

    return parts.join(' ');
  };

  const handleAnalyze = async () => {
    if (!selectedResumeId) {
      Alert.alert('Select Resume', 'Please select a resume to analyze.');
      return;
    }
    if (!jobDescription.trim()) {
      Alert.alert('Enter Job Description', 'Please paste the job description.');
      return;
    }

    const resume = resumes.find((r) => r.id === selectedResumeId);
    if (!resume) return;

    const resumeText = getResumeText(resume);
    const title = jobTitle.trim() || 'Job Position';

    const analysis = await analyze(resumeText, jobDescription, title, resume.id, null);
    if (analysis) {
      navigation.navigate('ATSResult', { analysisId: analysis.id });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>ATS Compatibility Check</Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        See how well your resume matches a job description
      </Text>

      {/* Resume Selection */}
      <Card style={styles.card}>
        <Card.Title title="Select Resume" />
        <Card.Content>
          {resumes.length === 0 ? (
            <Text variant="bodyMedium" style={[styles.hint, { color: theme.colors.textMuted }]}>
              No resumes found. Create one first.
            </Text>
          ) : (
            <RadioButton.Group onValueChange={setSelectedResumeId} value={selectedResumeId}>
              {resumes.map((resume) => (
                <RadioButton.Item
                  key={resume.id}
                  label={`${resume.title}${resume.is_primary ? ' (Primary)' : ''}`}
                  value={resume.id}
                  style={styles.radioItem}
                />
              ))}
            </RadioButton.Group>
          )}
        </Card.Content>
      </Card>

      {/* Job Details */}
      <Card style={styles.card}>
        <Card.Title title="Job Details" />
        <Card.Content>
          <TextInput
            label="Job Title"
            value={jobTitle}
            onChangeText={setJobTitle}
            mode="outlined"
            placeholder="e.g., Senior Software Engineer"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="Job Description *"
            value={jobDescription}
            onChangeText={setJobDescription}
            mode="outlined"
            multiline
            numberOfLines={8}
            placeholder="Paste the full job description here..."
            style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface }]}
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleAnalyze}
        loading={loading}
        disabled={loading || !selectedResumeId || !jobDescription.trim()}
        style={styles.button}
        contentStyle={styles.buttonContent}
        icon="chart-bar"
      >
        {loading ? 'Analyzing...' : 'Analyze Resume'}
      </Button>

      {loading && (
        <Text variant="bodySmall" style={[styles.loadingHint, { color: theme.colors.textSecondary }]}>
          Running algorithmic analysis{'\n'}This may take a moment if AI enhancement is enabled
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 4 },
  subtitle: { marginBottom: 24 },
  card: { marginBottom: 16, borderRadius: 12 },
  input: { marginBottom: 12 },
  textArea: { minHeight: 120 },
  radioItem: { paddingVertical: 2 },
  hint: { fontStyle: 'italic' },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  loadingHint: { textAlign: 'center', marginTop: 12 },
});

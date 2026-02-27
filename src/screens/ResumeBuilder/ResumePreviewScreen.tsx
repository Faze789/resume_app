import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { useAuth } from '../../hooks/useAuth';
import { useResume } from '../../hooks/useResume';
import { ResumePdfService } from '../../services/resume/resumePdf.service';
import type { ResumeScreenProps } from '../../types/navigation';
import type { Resume } from '../../types/models';

export default function ResumePreviewScreen({ route }: ResumeScreenProps<'ResumePreview'>) {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { resumes } = useResume(user?.id);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resume = resumes.find((r) => r.id === route.params.resumeId);

  const handleDownload = async () => {
    if (!resume) return;
    setLoading(true);
    try {
      const uri = await ResumePdfService.generatePDF(resume);
      setPdfUri(uri);
      await ResumePdfService.sharePDF(uri);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!resume) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge">Resume not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.preview}>
        <Text variant="titleMedium" style={styles.title}>{resume.title}</Text>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <Text variant="bodyMedium" style={[styles.infoRow, { color: theme.colors.onSurfaceVariant }]}>
            Name: {resume.content.personal_info.full_name || 'Not set'}
          </Text>
          <Text variant="bodyMedium" style={[styles.infoRow, { color: theme.colors.onSurfaceVariant }]}>
            Email: {resume.content.personal_info.email || 'Not set'}
          </Text>
          <Text variant="bodyMedium" style={[styles.infoRow, { color: theme.colors.onSurfaceVariant }]}>
            Sections: {resume.content.sections.length}
          </Text>
          <Text variant="bodyMedium" style={[styles.infoRow, { color: theme.colors.onSurfaceVariant }]}>
            Total items: {resume.content.sections.reduce((sum, s) => sum + s.items.length, 0)}
          </Text>
        </View>
        {resume.content.summary ? (
          <View style={[styles.summaryBox, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleSmall" style={styles.summaryTitle}>Summary</Text>
            <Text variant="bodyMedium" style={[styles.summaryText, { color: theme.colors.onSurfaceVariant }]}>{resume.content.summary}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.actions, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
        <Button
          mode="contained"
          icon="download"
          onPress={handleDownload}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Download & Share PDF
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  preview: { flex: 1, padding: 20 },
  title: { fontWeight: '700', marginBottom: 16 },
  infoCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  infoRow: { marginBottom: 6 },
  summaryBox: { borderRadius: 12, padding: 16 },
  summaryTitle: { fontWeight: '600', marginBottom: 8 },
  summaryText: { lineHeight: 22 },
  actions: { padding: 16, borderTopWidth: 1 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
});

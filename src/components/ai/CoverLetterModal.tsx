import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Share, Platform } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, IconButton } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { Skeleton } from '../ui/SkeletonLoader';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../hooks/useAuth';
import { settingsStorage } from '../../services/storage/settings.storage';
import { generateCoverLetter } from '../../services/ai/coverLetter.ai';
import type { JobListing } from '../../types/models';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  job: JobListing;
};

export function CoverLetterModal({ visible, onDismiss, job }: Props) {
  const theme = useAppTheme();
  const { profile } = useAuth();

  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    setError(null);
    setLetter('');
    setGenerated(false);

    try {
      const settings = await settingsStorage.get();
      const apiKey = settings.gemini_api_key;
      if (!apiKey) {
        setError('Gemini API key not configured. Go to Settings to add it.');
        return;
      }

      const result = await generateCoverLetter(apiKey, profile, job);
      setLetter(result);
      setGenerated(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate cover letter');
    } finally {
      setLoading(false);
    }
  }, [profile, job]);

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        await Share.share({ message: letter });
        return;
      }

      const file = new ExpoFile(Paths.cache, 'cover_letter.txt');
      file.write(letter);
      const fileUri = file.uri;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Share Cover Letter' });
      } else {
        await Share.share({ message: letter });
      }
    } catch {
      await Share.share({ message: letter });
    }
  };

  const handleCopy = async () => {
    try {
      await Share.share({ message: letter });
    } catch { /* ignore */ }
  };

  const handleDismiss = () => {
    setLetter('');
    setError(null);
    setLoading(false);
    setGenerated(false);
    setIsEditing(false);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            AI Cover Letter
          </Text>
          <IconButton icon="close" size={22} onPress={handleDismiss} />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Initial State — Generate button */}
          {!loading && !generated && !error && (
            <View style={styles.initialState}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 8 }}>
                Generate a personalized cover letter for
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', textAlign: 'center', marginBottom: 4 }}>
                {job.title}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
                at {job.company_name}
              </Text>
              <Button
                mode="contained"
                icon="auto-fix"
                onPress={handleGenerate}
                style={styles.generateButton}
                contentStyle={styles.generateContent}
              >
                Generate AI Cover Letter
              </Button>
            </View>
          )}

          {/* Loading */}
          {loading && (
            <View style={styles.loadingState}>
              <Skeleton width="100%" height={16} />
              <Skeleton width="90%" height={16} style={{ marginTop: 8 }} />
              <Skeleton width="95%" height={16} style={{ marginTop: 8 }} />
              <Skeleton width="70%" height={16} style={{ marginTop: 8 }} />
              <Skeleton width="85%" height={16} style={{ marginTop: 8 }} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 20 }}>
                Crafting your cover letter...
              </Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorState}>
              <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 16 }}>
                {error}
              </Text>
              <Button mode="contained-tonal" onPress={handleGenerate}>Try Again</Button>
            </View>
          )}

          {/* Generated Letter */}
          {generated && letter && (
            <View>
              <View style={styles.toneRow}>
                <View style={[styles.toneBadge, { backgroundColor: theme.colors.tertiaryContainer }]}>
                  <Text style={{ color: theme.colors.tertiary, fontSize: 12, fontWeight: '600' }}>
                    Professional & Personalized
                  </Text>
                </View>
              </View>

              {isEditing ? (
                <TextInput
                  value={letter}
                  onChangeText={setLetter}
                  mode="outlined"
                  multiline
                  numberOfLines={20}
                  style={[styles.editor, { backgroundColor: theme.colors.surface }]}
                />
              ) : (
                <Text variant="bodyMedium" style={[styles.letterText, { color: theme.colors.onSurface }]}>
                  {letter}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        {generated && letter && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.actions}>
              <Button
                mode={isEditing ? 'contained-tonal' : 'outlined'}
                icon={isEditing ? 'check' : 'pencil'}
                onPress={() => setIsEditing(!isEditing)}
                compact
                style={styles.actionBtn}
              >
                {isEditing ? 'Done' : 'Edit'}
              </Button>
              <Button
                mode="outlined"
                icon="share-variant"
                onPress={handleShare}
                compact
                style={styles.actionBtn}
              >
                Share
              </Button>
              <Button
                mode="outlined"
                icon="refresh"
                onPress={handleGenerate}
                compact
                style={styles.actionBtn}
              >
                Regenerate
              </Button>
            </View>
          </>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 0,
    marginBottom: 0,
    marginTop: 'auto',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontWeight: '700' },
  divider: { height: 1, marginHorizontal: 16 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 8 },

  initialState: { alignItems: 'center', paddingVertical: 32 },
  generateButton: { borderRadius: 16 },
  generateContent: { paddingVertical: 8, paddingHorizontal: 16 },

  loadingState: { alignItems: 'center', paddingVertical: 48 },
  errorState: { alignItems: 'center', paddingVertical: 32 },

  toneRow: { flexDirection: 'row', marginBottom: 16 },
  toneBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },

  letterText: { lineHeight: 24 },
  editor: { minHeight: 200 },

  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  actionBtn: { flex: 1, borderRadius: 12 },
});

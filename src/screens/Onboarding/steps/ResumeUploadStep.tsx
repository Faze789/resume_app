import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, HelperText, TextInput } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../../config/themes';
import { ResumeParseService } from '../../../services/resume/resumeParse.service';
import { settingsStorage } from '../../../services/storage/settings.storage';
import type { ParsedResumeData } from '../../../types/models';

type Props = {
  userId: string;
  onParsed: (data: ParsedResumeData, fileUri: string) => void;
  onSkip: () => void;
};

export function ResumeUploadStep({ userId, onParsed, onSkip }: Props) {
  const theme = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [needsKey, setNeedsKey] = useState(false);
  const pendingFileRef = useRef<{ uri: string; mimeType: string } | null>(null);

  useEffect(() => {
    settingsStorage.get().then((s) => {
      if (s.groq_api_key) setApiKey(s.groq_api_key);
    });
  }, []);

  const saveApiKey = async (key: string) => {
    setApiKey(key);
    const settings = await settingsStorage.get();
    await settingsStorage.set({ ...settings, groq_api_key: key || null });
  };

  const parseFile = async (fileUri: string, mimeType: string, key: string) => {
    setLoading(true);
    setError('');
    setStatus('Starting...');
    try {
      const parsed = await ResumeParseService.parseFile(
        fileUri,
        mimeType,
        key,
        (progressStatus) => setStatus(progressStatus)
      );

      // Validate that we actually got useful data
      const hasName = !!parsed.profile?.full_name?.trim();
      const hasSkills = (parsed.profile?.skills?.length || 0) > 0;

      if (!hasName && !hasSkills) {
        setError(
          'The AI could not extract meaningful data from this resume. ' +
          'Please try a different file format (PDF or DOCX) or skip to manual entry.'
        );
        setLoading(false);
        return;
      }

      setStatus('Done!');
      onParsed(parsed, pendingFileRef.current?.uri || fileUri);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to parse resume';
      setError(errorMsg);
      setLoading(false);
      // Also show an Alert so the user can clearly see the error
      Alert.alert('Resume Parsing Error', errorMsg);
    }
  };

  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'image/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setFileName(file.name);
      setError('');

      const fileMime = file.mimeType || 'application/pdf';
      pendingFileRef.current = { uri: file.uri, mimeType: fileMime };

      // Check for API key
      const currentKey = apiKey || (await settingsStorage.get()).groq_api_key;
      if (!currentKey) {
        setNeedsKey(true);
        setError('A Groq API key is required for AI resume parsing. Enter it below or skip to manual entry.');
        return;
      }

      await parseFile(file.uri, fileMime, currentKey);
    } catch (err: any) {
      setError(err.message || 'Failed to pick file');
      setLoading(false);
    }
  };

  const handleRetryWithKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }
    if (!apiKey.trim().startsWith('gsk_')) {
      setError('Invalid key format. Groq API keys start with "gsk_". Get one at console.groq.com/keys');
      return;
    }
    await saveApiKey(apiKey.trim());
    setNeedsKey(false);
    setError('');

    if (pendingFileRef.current) {
      await parseFile(pendingFileRef.current.uri, pendingFileRef.current.mimeType, apiKey.trim());
    } else {
      handlePick();
    }
  };

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="file-document-outline" size={64} color={theme.colors.primary} />
      <Text variant="headlineSmall" style={styles.title}>Upload Your Resume</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
        We'll use AI to extract your information automatically
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Parsing {fileName}...
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 8, fontWeight: '500', textAlign: 'center' }}>
            {status}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
            This may take 10-30 seconds
          </Text>
        </View>
      ) : needsKey ? (
        <View style={styles.keyContainer}>
          <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>
            Get a free key at console.groq.com
          </Text>
          <TextInput
            label="Groq API Key"
            value={apiKey}
            onChangeText={setApiKey}
            mode="outlined"
            placeholder="gsk_..."
            autoCapitalize="none"
            autoCorrect={false}
            right={<TextInput.Icon icon="key" />}
            style={[styles.keyInput, { backgroundColor: theme.colors.surface }]}
          />
          {error ? (
            <HelperText type="error" visible={!!error} style={styles.error}>
              {error}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            onPress={handleRetryWithKey}
            style={styles.button}
            contentStyle={styles.buttonContent}
            disabled={!apiKey.trim()}
          >
            Save Key & Parse Resume
          </Button>
          <Button mode="text" onPress={onSkip} style={styles.skip}>
            Skip - I'll enter details manually
          </Button>
        </View>
      ) : (
        <>
          <Button
            mode="contained"
            icon="upload"
            onPress={handlePick}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Choose File (PDF/DOC)
          </Button>

          {error ? (
            <View style={styles.errorContainer}>
              <HelperText type="error" visible={!!error} style={styles.error}>
                {error}
              </HelperText>
              {/* Retry button when there's an error */}
              {pendingFileRef.current && (
                <Button
                  mode="outlined"
                  onPress={() => {
                    const f = pendingFileRef.current!;
                    parseFile(f.uri, f.mimeType, apiKey);
                  }}
                  compact
                  style={styles.retryButton}
                >
                  Retry
                </Button>
              )}
            </View>
          ) : null}

          <Button mode="text" onPress={onSkip} style={styles.skip}>
            Skip - I'll enter details manually
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontWeight: '700', marginTop: 16, marginBottom: 8 },
  button: { borderRadius: 12, minWidth: 220 },
  buttonContent: { paddingVertical: 6 },
  error: { marginTop: 8 },
  errorContainer: { alignItems: 'center', marginTop: 4 },
  retryButton: { marginTop: 8, borderRadius: 8 },
  skip: { marginTop: 24 },
  loadingContainer: { alignItems: 'center', marginTop: 32 },
  loadingText: { marginTop: 16, fontWeight: '500' },
  keyContainer: { width: '100%', alignItems: 'center', marginTop: 16 },
  keyInput: { width: '100%', marginBottom: 8 },
});

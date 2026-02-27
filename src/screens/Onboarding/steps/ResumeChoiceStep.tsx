import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../../config/themes';

type Props = {
  onHasResume: () => void;
  onNoResume: () => void;
};

export function ResumeChoiceStep({ onHasResume, onNoResume }: Props) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Welcome!</Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
        Do you already have a resume?
      </Text>

      <Card style={styles.card} onPress={onHasResume}>
        <Card.Content style={styles.cardContent}>
          <MaterialCommunityIcons name="file-upload-outline" size={48} color={theme.colors.primary} />
          <Text variant="titleMedium" style={styles.cardTitle}>Yes, I have a resume</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
            Upload your PDF or DOC file and we'll extract your information automatically
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} onPress={onNoResume}>
        <Card.Content style={styles.cardContent}>
          <MaterialCommunityIcons name="pencil-plus-outline" size={48} color={theme.colors.secondary} />
          <Text variant="titleMedium" style={styles.cardTitle}>No, help me create one</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
            We'll guide you step by step to build a professional resume
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  card: { marginBottom: 16, borderRadius: 16 },
  cardContent: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  cardTitle: { fontWeight: '600', marginTop: 12, marginBottom: 4 },
});

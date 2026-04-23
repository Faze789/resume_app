import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useAppTheme } from '../../../config/themes';
import type { UserProfile } from '../../../types/models';

type Props = {
  formData: Partial<UserProfile>;
  onUpdate: (updates: Partial<UserProfile>) => void;
  onComplete: () => void;
  onBack: () => void;
  saving: boolean;
};

export function LinksStep({ formData, onUpdate, onComplete, onBack, saving }: Props) {
  const theme = useAppTheme();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Professional Links</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        Add your online profiles (optional)
      </Text>

      <TextInput
        label="LinkedIn URL"
        value={formData.linkedin_url || ''}
        onChangeText={(v) => onUpdate({ linkedin_url: v })}
        mode="outlined"
        placeholder="https://linkedin.com/in/yourprofile"
        autoCapitalize="none"
        keyboardType="url"
        left={<TextInput.Icon icon="linkedin" />}
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <TextInput
        label="GitHub URL"
        value={formData.github_url || ''}
        onChangeText={(v) => onUpdate({ github_url: v })}
        mode="outlined"
        placeholder="https://github.com/yourusername"
        autoCapitalize="none"
        keyboardType="url"
        left={<TextInput.Icon icon="github" />}
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <TextInput
        label="Portfolio URL"
        value={formData.portfolio_url || ''}
        onChangeText={(v) => onUpdate({ portfolio_url: v })}
        mode="outlined"
        placeholder="https://yourportfolio.com"
        autoCapitalize="none"
        keyboardType="url"
        left={<TextInput.Icon icon="web" />}
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <View style={styles.buttons}>
        <Button mode="outlined" onPress={onBack}>Back</Button>
        <Button
          mode="contained"
          onPress={onComplete}
          loading={saving}
          disabled={saving}
        >
          Complete Setup
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 8 },
  input: { marginBottom: 16 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
});

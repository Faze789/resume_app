import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useAppTheme } from '../../../config/themes';
import type { UserProfile } from '../../../types/models';

type Props = {
  formData: Partial<UserProfile>;
  onUpdate: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
};

export function BasicInfoStep({ formData, onUpdate, onNext }: Props) {
  const theme = useAppTheme();
  const canContinue = !!(formData.full_name?.trim());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Tell us about yourself</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        Basic information for your profile
      </Text>

      <TextInput
        label="Full Name *"
        value={formData.full_name || ''}
        onChangeText={(v) => onUpdate({ full_name: v })}
        mode="outlined"
        autoCapitalize="words"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <TextInput
        label="Professional Headline"
        value={formData.headline || ''}
        onChangeText={(v) => onUpdate({ headline: v })}
        mode="outlined"
        placeholder="e.g., Full Stack Developer"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <TextInput
        label="Location"
        value={formData.location || ''}
        onChangeText={(v) => onUpdate({ location: v })}
        mode="outlined"
        placeholder="e.g., New York, NY"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <TextInput
        label="Phone Number"
        value={formData.phone || ''}
        onChangeText={(v) => onUpdate({ phone: v })}
        mode="outlined"
        keyboardType="phone-pad"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <TextInput
        label="Years of Experience"
        value={String(formData.experience_years || '')}
        onChangeText={(v) => onUpdate({ experience_years: parseInt(v) || 0 })}
        mode="outlined"
        keyboardType="numeric"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <TextInput
        label="Professional Summary"
        value={formData.bio || ''}
        onChangeText={(v) => onUpdate({ bio: v })}
        mode="outlined"
        multiline
        numberOfLines={4}
        placeholder="Brief summary of your professional background..."
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <Button
        mode="contained"
        onPress={onNext}
        disabled={!canContinue}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Next
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 8 },
  input: { marginBottom: 16 },
  button: { marginTop: 8, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
});

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useAppTheme } from '../../../config/themes';
import type { UserProfile } from '../../../types/models';

type Props = {
  formData: Partial<UserProfile>;
  onUpdate: (updates: Partial<UserProfile>) => void;
  lowConfidenceFields: string[];
  onContinue: () => void;
  onBack: () => void;
};

const FIELD_LABELS: Record<string, string> = {
  headline: 'Professional Headline',
  location: 'Location',
  phone: 'Phone Number',
  skills: 'Key Skills',
  experience_years: 'Years of Experience',
  bio: 'Professional Summary',
};

export function SmartInterviewStep({ formData, onUpdate, lowConfidenceFields, onContinue, onBack }: Props) {
  const theme = useAppTheme();
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.skills?.includes(skill)) {
      onUpdate({ skills: [...(formData.skills || []), skill] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    onUpdate({ skills: (formData.skills || []).filter((s) => s !== skill) });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>A few details are missing</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        We couldn't find these details in your resume. Please fill them in below.
      </Text>

      {lowConfidenceFields.includes('headline') && (
        <TextInput
          label={FIELD_LABELS.headline}
          value={formData.headline || ''}
          onChangeText={(v) => onUpdate({ headline: v })}
          mode="outlined"
          placeholder="e.g., Senior Software Engineer"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />
      )}

      {lowConfidenceFields.includes('location') && (
        <TextInput
          label={FIELD_LABELS.location}
          value={formData.location || ''}
          onChangeText={(v) => onUpdate({ location: v })}
          mode="outlined"
          placeholder="e.g., San Francisco, CA"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />
      )}

      {lowConfidenceFields.includes('phone') && (
        <TextInput
          label={FIELD_LABELS.phone}
          value={formData.phone || ''}
          onChangeText={(v) => onUpdate({ phone: v })}
          mode="outlined"
          keyboardType="phone-pad"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />
      )}

      {lowConfidenceFields.includes('experience_years') && (
        <TextInput
          label={FIELD_LABELS.experience_years}
          value={String(formData.experience_years || '')}
          onChangeText={(v) => onUpdate({ experience_years: parseInt(v) || 0 })}
          mode="outlined"
          keyboardType="numeric"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />
      )}

      {lowConfidenceFields.includes('skills') && (
        <View style={styles.skillSection}>
          <Text variant="titleSmall" style={styles.skillLabel}>Key Skills</Text>
          <View style={styles.skillInputRow}>
            <TextInput
              value={skillInput}
              onChangeText={setSkillInput}
              placeholder="Add a skill..."
              mode="outlined"
              style={[styles.skillInput, { backgroundColor: theme.colors.surface }]}
              onSubmitEditing={addSkill}
            />
            <Button mode="contained-tonal" onPress={addSkill} compact>Add</Button>
          </View>
          <View style={styles.chips}>
            {(formData.skills || []).map((skill) => (
              <Chip key={skill} onClose={() => removeSkill(skill)} style={styles.chip}>
                {skill}
              </Chip>
            ))}
          </View>
        </View>
      )}

      {lowConfidenceFields.includes('bio') && (
        <TextInput
          label={FIELD_LABELS.bio}
          value={formData.bio || ''}
          onChangeText={(v) => onUpdate({ bio: v })}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />
      )}

      <View style={styles.buttons}>
        <Button mode="outlined" onPress={onBack}>Back</Button>
        <Button mode="contained" onPress={onContinue}>Continue</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 8 },
  input: { marginBottom: 16 },
  skillSection: { marginBottom: 16 },
  skillLabel: { marginBottom: 8, fontWeight: '600' },
  skillInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillInput: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { marginBottom: 4 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
});

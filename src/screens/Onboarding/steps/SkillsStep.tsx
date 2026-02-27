import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useAppTheme } from '../../../config/themes';
import { SKILL_DICTIONARY, normalizeSkill } from '../../../utils/skillDictionary';
import type { UserProfile } from '../../../types/models';

type Props = {
  formData: Partial<UserProfile>;
  onUpdate: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
};

const SUGGESTED_SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'SQL',
  'Java', 'AWS', 'Docker', 'Git', 'REST API', 'MongoDB',
  'HTML', 'CSS', 'React Native', 'PostgreSQL', 'Machine Learning',
  'Agile', 'Communication', 'Leadership',
];

export function SkillsStep({ formData, onUpdate, onNext, onBack }: Props) {
  const theme = useAppTheme();
  const [input, setInput] = useState('');
  const skills = formData.skills || [];

  const addSkill = (skill: string) => {
    const normalized = normalizeSkill(skill);
    if (normalized && !skills.includes(normalized)) {
      onUpdate({ skills: [...skills, normalized] });
    }
    setInput('');
  };

  const removeSkill = (skill: string) => {
    onUpdate({ skills: skills.filter((s) => s !== skill) });
  };

  const filteredSuggestions = SUGGESTED_SKILLS.filter(
    (s) => !skills.includes(s) && (!input || s.toLowerCase().includes(input.toLowerCase()))
  ).slice(0, 12);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Your Skills</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        Add skills to help us match you with the right jobs
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a skill..."
          mode="outlined"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          onSubmitEditing={() => input.trim() && addSkill(input.trim())}
        />
        <Button
          mode="contained-tonal"
          onPress={() => input.trim() && addSkill(input.trim())}
          disabled={!input.trim()}
          compact
        >
          Add
        </Button>
      </View>

      {skills.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Your Skills ({skills.length})</Text>
          <View style={styles.chips}>
            {skills.map((skill) => (
              <Chip
                key={skill}
                onClose={() => removeSkill(skill)}
                style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}
                textStyle={{ color: theme.colors.onPrimaryContainer }}
              >
                {skill}
              </Chip>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>Suggestions</Text>
        <View style={styles.chips}>
          {filteredSuggestions.map((skill) => (
            <Chip
              key={skill}
              onPress={() => addSkill(skill)}
              icon="plus"
              style={styles.chip}
            >
              {skill}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.buttons}>
        <Button mode="outlined" onPress={onBack}>Back</Button>
        <Button mode="contained" onPress={onNext} disabled={skills.length === 0}>
          Next ({skills.length} skills)
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  input: { flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});

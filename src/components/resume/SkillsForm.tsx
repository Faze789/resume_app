import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Chip, Text } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { generateId } from '../../utils/id';
import type { ResumeSkillCategory } from '../../types/models';

type Props = {
  item?: ResumeSkillCategory;
  onSave: (item: ResumeSkillCategory) => void;
  onCancel: () => void;
};

export function SkillsForm({ item, onSave, onCancel }: Props) {
  const theme = useAppTheme();
  const [form, setForm] = useState<ResumeSkillCategory>(
    item || { id: generateId(), category: '', skills: [] }
  );
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !form.skills.includes(skill)) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setForm((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Category *"
        value={form.category}
        onChangeText={(v) => setForm((prev) => ({ ...prev, category: v }))}
        mode="outlined"
        placeholder="e.g., Programming Languages"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={skillInput}
          onChangeText={setSkillInput}
          placeholder="Add a skill..."
          mode="outlined"
          style={[styles.input, { flex: 1, backgroundColor: theme.colors.surface }]}
          onSubmitEditing={addSkill}
        />
        <Button mode="contained-tonal" onPress={addSkill} compact>Add</Button>
      </View>

      <View style={styles.chips}>
        {form.skills.map((skill) => (
          <Chip key={skill} onClose={() => removeSkill(skill)} style={styles.chip}>{skill}</Chip>
        ))}
      </View>
      {form.skills.length === 0 && <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.textMuted }]}>Add at least one skill</Text>}

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCancel}>Cancel</Button>
        <Button mode="contained" onPress={() => onSave(form)} disabled={!form.category || form.skills.length === 0}>Save</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 16 },
  chip: { marginBottom: 4 },
  hint: { marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
});

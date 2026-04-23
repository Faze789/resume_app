import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { generateId } from '../../utils/id';
import type { ResumeEducationItem } from '../../types/models';

type Props = {
  item?: ResumeEducationItem;
  onSave: (item: ResumeEducationItem) => void;
  onCancel: () => void;
};

export function EducationForm({ item, onSave, onCancel }: Props) {
  const theme = useAppTheme();
  const [form, setForm] = useState<ResumeEducationItem>(
    item || {
      id: generateId(),
      title: '',
      organization: '',
      location: '',
      start_date: '',
      end_date: '',
      description: '',
      bullets: [],
    }
  );

  const updateField = (key: keyof ResumeEducationItem, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <View style={styles.container}>
      <TextInput label="Degree/Program *" value={form.title} onChangeText={(v) => updateField('title', v)} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
      <TextInput label="School/University *" value={form.organization} onChangeText={(v) => updateField('organization', v)} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
      <TextInput label="Location" value={form.location || ''} onChangeText={(v) => updateField('location', v)} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
      <View style={styles.row}>
        <TextInput label="Start Date" value={form.start_date} onChangeText={(v) => updateField('start_date', v)} mode="outlined" placeholder="MM/YYYY" style={[styles.input, styles.half, { backgroundColor: theme.colors.surface }]} />
        <TextInput label="End Date" value={form.end_date || ''} onChangeText={(v) => updateField('end_date', v)} mode="outlined" placeholder="MM/YYYY" style={[styles.input, styles.half, { backgroundColor: theme.colors.surface }]} />
      </View>
      <TextInput label="Description" value={form.description || ''} onChangeText={(v) => updateField('description', v)} mode="outlined" multiline numberOfLines={3} style={[styles.input, { backgroundColor: theme.colors.surface }]} />

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCancel}>Cancel</Button>
        <Button mode="contained" onPress={() => onSave(form)} disabled={!form.title || !form.organization}>Save</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
});

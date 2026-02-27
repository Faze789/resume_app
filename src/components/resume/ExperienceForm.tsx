import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Checkbox, Text } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { generateId } from '../../utils/id';
import type { ResumeExperienceItem } from '../../types/models';

type Props = {
  item?: ResumeExperienceItem;
  onSave: (item: ResumeExperienceItem) => void;
  onCancel: () => void;
};

export function ExperienceForm({ item, onSave, onCancel }: Props) {
  const theme = useAppTheme();
  const [form, setForm] = useState<ResumeExperienceItem>(
    item || {
      id: generateId(),
      title: '',
      organization: '',
      location: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
      bullets: [''],
      skills_used: [],
    }
  );

  const updateField = (key: keyof ResumeExperienceItem, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateBullet = (index: number, text: string) => {
    const bullets = [...form.bullets];
    bullets[index] = text;
    setForm((prev) => ({ ...prev, bullets }));
  };

  const addBullet = () => setForm((prev) => ({ ...prev, bullets: [...prev.bullets, ''] }));

  const removeBullet = (index: number) => {
    setForm((prev) => ({ ...prev, bullets: prev.bullets.filter((_, i) => i !== index) }));
  };

  return (
    <View style={styles.container}>
      <TextInput label="Job Title *" value={form.title} onChangeText={(v) => updateField('title', v)} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
      <TextInput label="Company *" value={form.organization} onChangeText={(v) => updateField('organization', v)} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
      <TextInput label="Location" value={form.location || ''} onChangeText={(v) => updateField('location', v)} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
      <View style={styles.row}>
        <TextInput label="Start Date" value={form.start_date} onChangeText={(v) => updateField('start_date', v)} mode="outlined" placeholder="MM/YYYY" style={[styles.input, styles.half, { backgroundColor: theme.colors.surface }]} />
        <TextInput label="End Date" value={form.end_date || ''} onChangeText={(v) => updateField('end_date', v)} mode="outlined" placeholder="MM/YYYY" disabled={form.is_current} style={[styles.input, styles.half, { backgroundColor: theme.colors.surface }]} />
      </View>
      <Checkbox.Item
        label="Currently working here"
        status={form.is_current ? 'checked' : 'unchecked'}
        onPress={() => updateField('is_current', !form.is_current)}
        style={styles.checkbox}
      />

      <Text variant="titleSmall" style={styles.bulletsTitle}>Bullet Points</Text>
      {form.bullets.map((bullet, i) => (
        <View key={i} style={styles.bulletRow}>
          <TextInput
            value={bullet}
            onChangeText={(v) => updateBullet(i, v)}
            mode="outlined"
            placeholder={`Achievement ${i + 1}...`}
            multiline
            style={[styles.input, styles.bulletInput, { backgroundColor: theme.colors.surface }]}
          />
          {form.bullets.length > 1 && (
            <Button icon="close" compact onPress={() => removeBullet(i)} textColor={theme.colors.error}>{''}</Button>
          )}
        </View>
      ))}
      <Button icon="plus" mode="text" onPress={addBullet} compact>Add Bullet</Button>

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
  checkbox: { paddingHorizontal: 0, marginBottom: 8 },
  bulletsTitle: { fontWeight: '600', marginBottom: 8, marginTop: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bulletInput: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
});

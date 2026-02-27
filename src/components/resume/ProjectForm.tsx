import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { generateId } from '../../utils/id';
import type { ResumeProjectItem } from '../../types/models';

type Props = {
  item?: ResumeProjectItem;
  onSave: (item: ResumeProjectItem) => void;
  onCancel: () => void;
};

export function ProjectForm({ item, onSave, onCancel }: Props) {
  const theme = useAppTheme();
  const [form, setForm] = useState<ResumeProjectItem>(
    item || { id: generateId(), title: '', description: '', url: '', bullets: [''], skills_used: [] }
  );

  const updateBullet = (index: number, text: string) => {
    const bullets = [...form.bullets];
    bullets[index] = text;
    setForm((prev) => ({ ...prev, bullets }));
  };

  const addBullet = () => setForm((prev) => ({ ...prev, bullets: [...prev.bullets, ''] }));

  return (
    <View style={styles.container}>
      <TextInput label="Project Name *" value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
      <TextInput label="Description" value={form.description || ''} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} mode="outlined" multiline style={[styles.input, { backgroundColor: theme.colors.surface }]} />
      <TextInput label="URL" value={form.url || ''} onChangeText={(v) => setForm((p) => ({ ...p, url: v }))} mode="outlined" autoCapitalize="none" style={[styles.input, { backgroundColor: theme.colors.surface }]} />

      <Text variant="titleSmall" style={styles.bulletsTitle}>Key Points</Text>
      {form.bullets.map((bullet, i) => (
        <TextInput
          key={i}
          value={bullet}
          onChangeText={(v) => updateBullet(i, v)}
          mode="outlined"
          placeholder={`Point ${i + 1}...`}
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />
      ))}
      <Button icon="plus" mode="text" onPress={addBullet} compact>Add Point</Button>

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCancel}>Cancel</Button>
        <Button mode="contained" onPress={() => onSave(form)} disabled={!form.title}>Save</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginBottom: 12 },
  bulletsTitle: { fontWeight: '600', marginBottom: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
});

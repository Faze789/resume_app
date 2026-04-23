import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useAppTheme } from '../../../config/themes';
import { JOB_TYPE_LABELS } from '../../../config/constants';
import type { UserProfile, JobType } from '../../../types/models';

type Props = {
  formData: Partial<UserProfile>;
  onUpdate: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
};

const JOB_TYPES: JobType[] = ['full_time', 'part_time', 'contract', 'internship', 'freelance', 'remote'];

export function JobPreferencesStep({ formData, onUpdate, onNext, onBack }: Props) {
  const theme = useAppTheme();
  const [locationInput, setLocationInput] = useState('');
  const selectedTypes = formData.desired_job_types || [];
  const selectedLocations = formData.desired_locations || [];

  const toggleJobType = (type: JobType) => {
    if (selectedTypes.includes(type)) {
      onUpdate({ desired_job_types: selectedTypes.filter((t) => t !== type) });
    } else {
      onUpdate({ desired_job_types: [...selectedTypes, type] });
    }
  };

  const addLocation = () => {
    const loc = locationInput.trim();
    if (loc && !selectedLocations.includes(loc)) {
      onUpdate({ desired_locations: [...selectedLocations, loc] });
      setLocationInput('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Job Preferences</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        What kind of jobs are you looking for?
      </Text>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>Job Types</Text>
        <View style={styles.chips}>
          {JOB_TYPES.map((type) => (
            <Chip
              key={type}
              selected={selectedTypes.includes(type)}
              onPress={() => toggleJobType(type)}
              showSelectedCheck
              style={[
                styles.chip,
                selectedTypes.includes(type) && { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              {JOB_TYPE_LABELS[type]}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>Preferred Locations</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={locationInput}
            onChangeText={setLocationInput}
            placeholder="Add a city or 'Remote'..."
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            onSubmitEditing={addLocation}
          />
          <Button mode="contained-tonal" onPress={addLocation} compact>Add</Button>
        </View>
        <View style={styles.chips}>
          {selectedLocations.map((loc) => (
            <Chip
              key={loc}
              onClose={() => onUpdate({ desired_locations: selectedLocations.filter((l) => l !== loc) })}
              style={styles.chip}
            >
              {loc}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>Salary Range (Annual USD)</Text>
        <View style={styles.salaryRow}>
          <TextInput
            label="Min"
            value={formData.desired_salary_min ? String(formData.desired_salary_min) : ''}
            onChangeText={(v) => onUpdate({ desired_salary_min: parseInt(v) || null })}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.salaryInput, { backgroundColor: theme.colors.surface }]}
          />
          <Text variant="bodyLarge" style={styles.salaryDash}>-</Text>
          <TextInput
            label="Max"
            value={formData.desired_salary_max ? String(formData.desired_salary_max) : ''}
            onChangeText={(v) => onUpdate({ desired_salary_max: parseInt(v) || null })}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.salaryInput, { backgroundColor: theme.colors.surface }]}
          />
        </View>
      </View>

      <View style={styles.buttons}>
        <Button mode="outlined" onPress={onBack}>Back</Button>
        <Button mode="contained" onPress={onNext}>Next</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1 },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  salaryInput: { flex: 1 },
  salaryDash: { fontWeight: '600' },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});

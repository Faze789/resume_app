import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, TextInput, Chip, Button, IconButton } from 'react-native-paper';
import { EXPERIENCE_LEVEL_LABELS } from '../../config/constants';
import { useAppTheme } from '../../config/themes';
import type { ExperienceLevel } from '../../types/models';

export type FilterValues = {
  location: string;
  experienceLevel: ExperienceLevel | null;
  isRemote: boolean | undefined;
  salaryMin: number | null;
  salaryMax: number | null;
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
  suggestedLocations: string[];
};

const EXPERIENCE_LEVELS: (ExperienceLevel | 'all')[] = ['all', 'entry', 'mid', 'senior', 'lead', 'executive'];

export function FilterBottomSheet({ visible, onDismiss, filters, onApply, suggestedLocations }: Props) {
  const theme = useAppTheme();
  const [location, setLocation] = useState(filters.location);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(filters.experienceLevel);
  const [isRemote, setIsRemote] = useState<boolean | undefined>(filters.isRemote);
  const [salaryMinText, setSalaryMinText] = useState(filters.salaryMin ? String(filters.salaryMin) : '');
  const [salaryMaxText, setSalaryMaxText] = useState(filters.salaryMax ? String(filters.salaryMax) : '');

  useEffect(() => {
    setLocation(filters.location);
    setExperienceLevel(filters.experienceLevel);
    setIsRemote(filters.isRemote);
    setSalaryMinText(filters.salaryMin ? String(filters.salaryMin) : '');
    setSalaryMaxText(filters.salaryMax ? String(filters.salaryMax) : '');
  }, [filters.location, filters.experienceLevel, filters.isRemote, filters.salaryMin, filters.salaryMax]);

  const handleApply = () => {
    const salaryMin = salaryMinText ? parseInt(salaryMinText, 10) : null;
    const salaryMax = salaryMaxText ? parseInt(salaryMaxText, 10) : null;
    onApply({ location, experienceLevel, isRemote, salaryMin: salaryMin && !isNaN(salaryMin) ? salaryMin : null, salaryMax: salaryMax && !isNaN(salaryMax) ? salaryMax : null });
    onDismiss();
  };

  const handleReset = () => {
    setLocation('');
    setExperienceLevel(null);
    setIsRemote(undefined);
    setSalaryMinText('');
    setSalaryMaxText('');
  };

  const hasActiveFilters = location || experienceLevel || isRemote !== undefined || salaryMinText || salaryMaxText;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />

        <View style={styles.header}>
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>Filters</Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            mode="outlined"
            placeholder="City, state, or country..."
            left={<TextInput.Icon icon="map-marker-outline" />}
            style={[styles.input, { backgroundColor: theme.colors.inputBackground }]}
            autoCapitalize="none"
            dense
          />
          {suggestedLocations.length > 0 && (
            <View style={styles.chipRow}>
              {suggestedLocations.map((loc) => (
                <Chip
                  key={loc}
                  compact
                  selected={location.toLowerCase() === loc.toLowerCase()}
                  onPress={() => setLocation(location.toLowerCase() === loc.toLowerCase() ? '' : loc)}
                  style={styles.suggestionChip}
                >
                  {loc}
                </Chip>
              ))}
            </View>
          )}

          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant, marginTop: 20 }]}>Experience Level</Text>
          <View style={styles.chipRow}>
            {EXPERIENCE_LEVELS.map((level) => (
              <Chip
                key={level}
                selected={level === 'all' ? experienceLevel === null : experienceLevel === level}
                onPress={() => setExperienceLevel(level === 'all' ? null : level)}
                compact
                style={[
                  styles.chip,
                  (level === 'all' ? experienceLevel === null : experienceLevel === level) && {
                    backgroundColor: theme.colors.primaryContainer,
                  },
                ]}
              >
                {level === 'all' ? 'All' : EXPERIENCE_LEVEL_LABELS[level]}
              </Chip>
            ))}
          </View>

          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant, marginTop: 20 }]}>Work Type</Text>
          <View style={styles.chipRow}>
            <Chip selected={isRemote === undefined} onPress={() => setIsRemote(undefined)} compact style={[styles.chip, isRemote === undefined && { backgroundColor: theme.colors.primaryContainer }]}>All</Chip>
            <Chip icon="wifi" selected={isRemote === true} onPress={() => setIsRemote(isRemote === true ? undefined : true)} compact style={[styles.chip, isRemote === true && { backgroundColor: theme.colors.primaryContainer }]}>Remote Only</Chip>
            <Chip icon="office-building-outline" selected={isRemote === false} onPress={() => setIsRemote(isRemote === false ? undefined : false)} compact style={[styles.chip, isRemote === false && { backgroundColor: theme.colors.primaryContainer }]}>On-site</Chip>
          </View>

          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant, marginTop: 20 }]}>Salary Range (USD/year)</Text>
          <View style={styles.salaryRow}>
            <TextInput value={salaryMinText} onChangeText={setSalaryMinText} mode="outlined" placeholder="Min" keyboardType="numeric" style={[styles.input, styles.salaryInput, { backgroundColor: theme.colors.inputBackground }]} left={<TextInput.Icon icon="currency-usd" />} dense />
            <Text variant="bodyMedium" style={[styles.salaryDash, { color: theme.colors.textSecondary }]}>-</Text>
            <TextInput value={salaryMaxText} onChangeText={setSalaryMaxText} mode="outlined" placeholder="Max" keyboardType="numeric" style={[styles.input, styles.salaryInput, { backgroundColor: theme.colors.inputBackground }]} left={<TextInput.Icon icon="currency-usd" />} dense />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button mode="outlined" onPress={handleReset} style={styles.resetButton} disabled={!hasActiveFilters}>Reset</Button>
          <Button mode="contained" onPress={handleApply} style={styles.applyButton}>Apply Filters</Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { marginHorizontal: 0, marginBottom: 0, marginTop: 'auto' as any, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24, maxHeight: '70%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  title: { fontWeight: '700' },
  content: { paddingHorizontal: 20, marginTop: 8 },
  sectionLabel: { fontWeight: '600', marginBottom: 8 },
  input: {},
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { flexShrink: 1 },
  suggestionChip: { flexShrink: 1 },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  salaryInput: { flex: 1 },
  salaryDash: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  resetButton: { flex: 1, borderRadius: 12 },
  applyButton: { flex: 2, borderRadius: 12 },
});

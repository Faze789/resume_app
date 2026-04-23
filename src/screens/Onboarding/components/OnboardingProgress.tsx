import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import { useAppTheme } from '../../../config/themes';

type Props = { current: number; total: number };

export function OnboardingProgress({ current, total }: Props) {
  const theme = useAppTheme();
  const progress = total > 0 ? (current + 1) / total : 0;

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
        Step {current + 1} of {total}
      </Text>
      <ProgressBar progress={progress} color={theme.colors.primary} style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  bar: { height: 6, borderRadius: 3 },
});

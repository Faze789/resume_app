import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../config/themes';

type Props = {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon as any} size={64} color={theme.colors.textMuted} />
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontWeight: '600', marginTop: 16, marginBottom: 8 },
  message: { textAlign: 'center', marginBottom: 24 },
  button: { minWidth: 160, borderRadius: 12 },
});

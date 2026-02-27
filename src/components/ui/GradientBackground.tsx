import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../config/themes';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function GradientBackground({ children, style }: Props) {
  const theme = useAppTheme();
  const isDark = theme.dark;

  const colors: [string, string] = isDark
    ? ['#0f172a', '#1e293b']
    : ['#EEF2FF', '#F8FAFC'];

  return (
    <LinearGradient colors={colors} style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

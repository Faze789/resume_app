import React from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../config/themes';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  borderRadius?: number;
};

export function GlassCard({ children, style, borderRadius = 16 }: Props) {
  const theme = useAppTheme();
  const isDark = theme.dark;

  const gradientColors: [string, string] = isDark
    ? ['rgba(30,41,59,0.95)', 'rgba(30,41,59,0.92)']
    : ['rgba(255,255,255,0.82)', 'rgba(255,255,255,0.52)'];

  const borderColor = isDark ? 'rgba(71,85,105,0.3)' : 'rgba(255,255,255,0.9)';

  return (
    <View
      style={[
        styles.shadow,
        { borderRadius },
        Platform.OS === 'ios' ? styles.iosShadow : { elevation: 3 },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius, borderColor }]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    overflow: 'hidden',
  },
  iosShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  gradient: {
    borderWidth: 1,
    padding: 16,
  },
});

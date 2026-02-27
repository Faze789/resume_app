import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '../../config/themes';

type Props = {
  score: number;
  size?: number;
  strokeWidth?: number;
};

export function MatchScoreRing({ score, size = 60, strokeWidth = 5 }: Props) {
  const theme = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    if (score >= 40) return '#EA580C';
    return theme.colors.error;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.outlineVariant}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.label}>
        <Text variant="labelLarge" style={[styles.score, { color: getColor() }]}>
          {Math.round(score)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  label: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  score: { fontWeight: '700' },
});

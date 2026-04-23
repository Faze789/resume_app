import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const bg = theme.dark ? '#334155' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: bg, opacity: pulse },
        style,
      ]}
    />
  );
}

export function SkeletonJobCard() {
  const theme = useTheme();
  const cardBg = theme.dark ? '#1E293B' : '#FFFFFF';

  return (
    <View style={[skeletonStyles.card, { backgroundColor: cardBg }]}>
      <View style={skeletonStyles.row}>
        <Skeleton width={42} height={42} borderRadius={12} />
        <View style={skeletonStyles.titleBlock}>
          <Skeleton width="80%" height={18} />
          <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={46} height={46} borderRadius={23} />
      </View>
      <View style={[skeletonStyles.row, { marginTop: 12 }]}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="25%" height={14} />
      </View>
      <View style={[skeletonStyles.row, { marginTop: 12 }]}>
        <Skeleton width={72} height={26} borderRadius={13} />
        <Skeleton width={60} height={26} borderRadius={13} />
        <Skeleton width={80} height={26} borderRadius={13} />
      </View>
    </View>
  );
}

export function SkeletonJobList({ count = 5 }: { count?: number }) {
  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonJobCard key={i} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  list: {
    paddingTop: 12,
  },
});

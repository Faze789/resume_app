import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../config/themes';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const theme = useAppTheme();
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

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.colors.skeleton,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

export function JobCardSkeleton() {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.topRow}>
        <Skeleton width={42} height={42} borderRadius={12} />
        <View style={styles.titleBlock}>
          <Skeleton width="80%" height={16} />
          <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={46} height={46} borderRadius={23} />
      </View>
      <View style={styles.metaRow}>
        <Skeleton width="40%" height={12} />
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>
      <View style={styles.chipRow}>
        <Skeleton width={70} height={26} borderRadius={13} />
        <Skeleton width={55} height={26} borderRadius={13} />
        <Skeleton width={50} height={26} borderRadius={13} />
      </View>
    </View>
  );
}

export function JobDetailSkeleton() {
  const theme = useAppTheme();

  return (
    <View style={[styles.detailContainer, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.detailCard, { backgroundColor: theme.colors.surface }]}>
        <Skeleton width="90%" height={22} />
        <Skeleton width="60%" height={16} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={14} style={{ marginTop: 6 }} />
        <View style={[styles.chipRow, { marginTop: 16 }]}>
          <Skeleton width={80} height={28} borderRadius={14} />
          <Skeleton width={70} height={28} borderRadius={14} />
          <Skeleton width={60} height={28} borderRadius={14} />
        </View>
      </View>
      <View style={[styles.detailCard, { backgroundColor: theme.colors.surface }]}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="100%" height={14} style={{ marginTop: 12 }} />
        <Skeleton width="100%" height={14} style={{ marginTop: 6 }} />
        <Skeleton width="75%" height={14} style={{ marginTop: 6 }} />
        <Skeleton width="100%" height={14} style={{ marginTop: 6 }} />
        <Skeleton width="60%" height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function JobListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleBlock: { flex: 1, gap: 0 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  listContainer: { padding: 16 },
  detailContainer: { flex: 1, padding: 16 },
  detailCard: { borderRadius: 16, padding: 20, marginBottom: 12 },
});

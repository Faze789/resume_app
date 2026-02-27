import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function useFadeIn(delay = 0, duration = 300): Animated.Value {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);
  return opacity;
}

export function useSlideUp(delay = 0, distance = 20, duration = 300): { opacity: Animated.Value; translateY: Animated.Value } {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, translateY };
}

export function useScale(delay = 0, from = 0.95, duration = 200): Animated.Value {
  const scale = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);
  return scale;
}

import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  children: React.ReactNode;
  leftRoute?: string;
  rightRoute?: string;
  downRoute?: string;
}

export function SwipeNavigation({ children, leftRoute, rightRoute, downRoute }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigateTo = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.navigate(route as any);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .activeOffsetY([-30, 30])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        if (e.translationX < -50 && rightRoute) {
          runOnJS(navigateTo)(rightRoute);
        } else if (e.translationX > 50 && leftRoute) {
          runOnJS(navigateTo)(leftRoute);
        }
      } else if (downRoute && e.translationY > 50) {
        runOnJS(navigateTo)(downRoute);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

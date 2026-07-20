import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface Props {
  children: React.ReactNode;
  leftRoute?: string;
  rightRoute?: string;
}

export function SwipeNavigation({ children, leftRoute, rightRoute }: Props) {
  const router = useRouter();

  const pan = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((e) => {
      if (e.translationX < -50 && rightRoute) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.navigate(rightRoute as any);
      } else if (e.translationX > 50 && leftRoute) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.navigate(leftRoute as any);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
